import type { AnalysisResult, LiveData } from '../types'
import type { Investor } from '../types'
import { fetchLiveData, buildLiveDataBlock } from './fmp'
import { buildPrompt } from './prompt'
import { extractJson, sanitizeTicker } from './utils'
import { sanitiseResult } from './sanitise'

/** Fetch current market price from Yahoo Finance (free, no key required). */
async function fetchYahooPrice(ticker: string, apiOrigin: string): Promise<number> {
  try {
    const r = await fetch(`${apiOrigin}/api/price/${encodeURIComponent(ticker)}`)
    if (!r.ok) return 0
    const d = await r.json() as { price?: number }
    return typeof d.price === 'number' && d.price > 0 ? d.price : 0
  } catch {
    return 0
  }
}

interface AnalyzeOptions {
  ticker: string
  investor: Investor
  provider: string
  model: string
  fmpKey: string | null
}

interface LLMResponse {
  content?: Array<{ type: string; text?: string }>
  error?: string
}

/** Map provider id → human-readable label for dataSource field */
function providerLabel(provider: string): string {
  switch (provider) {
    case 'google':  return 'Gemini'
    case 'openai':  return 'GPT'
    case 'mistral': return 'Mistral'
    default:        return 'Claude'
  }
}

/** Map provider id → server proxy endpoint */
function llmEndpoint(provider: string): string {
  switch (provider) {
    case 'google':    return '/api/gemini'
    case 'openai':    return '/api/openai'
    case 'mistral':   return '/api/mistral'
    case 'anthropic':
    default:          return '/api/claude'
  }
}

/**
 * Main analysis orchestrator.
 * 1. Fetch live FMP data (if fmpKey is set)
 * 2. Build prompt
 * 3. Call Claude via /api/claude proxy
 * 4. Extract + sanitise LLM output
 * 5. Return typed AnalysisResult
 */
export async function runAnalysis(opts: AnalyzeOptions): Promise<AnalysisResult> {
  const ticker = sanitizeTicker(opts.ticker)
  if (!ticker) throw new Error('Invalid ticker symbol')
  const { investor, fmpKey } = opts

  // Step 1 — Fetch live data
  let liveData: LiveData | null = null
  if (fmpKey) {
    try {
      const fetched = await fetchLiveData(ticker, fmpKey)
      // Only treat as live if at least one key field came back
      const hasData = fetched.profile !== null || fetched.ratios !== null ||
        fetched.quote !== null || fetched.income.length > 0 || fetched.cashFlow.length > 0
      liveData = hasData ? fetched : null
    } catch {
      // Non-fatal — fall back to AI-estimated data
    }
  }

  // Step 2 — Build prompt
  const liveBlock = liveData ? buildLiveDataBlock(liveData) : null
  const prompt = buildPrompt(ticker, investor, liveBlock)

  // Step 3 — Call LLM and fetch Yahoo price in parallel
  const apiOrigin = typeof window === 'undefined' ? (process.env?.['API_BASE'] ?? '') : ''
  const endpoint = llmEndpoint(opts.provider)
  const [resp, yahooPrice] = await Promise.all([
    fetch(`${apiOrigin}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: opts.model }),
    }),
    fetchYahooPrice(ticker, apiOrigin),
  ])

  if (!resp.ok) {
    const err = (await resp.json().catch(() => ({ error: resp.statusText }))) as { error?: string }
    throw new Error(err.error ?? `LLM API error ${resp.status}`)
  }

  const data = (await resp.json()) as LLMResponse

  // Step 4 — Extract JSON from LLM response
  const rawText = data.content?.find((b) => b.type === 'text')?.text ?? ''
  const parsed = extractJson(rawText)
  if (!parsed) {
    throw new Error('LLM response did not contain valid JSON')
  }

  // Step 5 — Sanitise and return
  const profile = liveData?.profile
  const quote   = liveData?.quote
  const ratios  = liveData?.ratios

  const result = sanitiseResult(parsed, {
    ticker:      ticker.toUpperCase(),
    companyName: profile?.companyName ?? ticker.toUpperCase(),
    sector:      profile?.sector ?? '',
    description: profile?.description ?? '',
    investorId:   investor.id,
    investorName: investor.name,
    dataSource:  liveData ? `FMP + ${providerLabel(opts.provider)}` : `${providerLabel(opts.provider)} (estimated)`,
    timestamp:   Date.now(),
    liveData,
    isLive:      liveData !== null,
  })

  // Pin market price: FMP quote is most accurate, Yahoo Finance is the free fallback.
  // Never use the LLM's guess for market price.
  if (quote?.price) {
    result.marketPrice = quote.price
  } else if (yahooPrice > 0) {
    result.marketPrice = yahooPrice
  }

  if (quote) {
    if (quote.pe) result.pe = quote.pe
  }
  if (ratios) {
    if (ratios.peRatioTTM)         result.pe     = ratios.peRatioTTM
    if (ratios.pegRatioTTM)        result.peg    = ratios.pegRatioTTM
    if (ratios.netProfitMarginTTM) result.margin = ratios.netProfitMarginTTM
    if (ratios.returnOnEquityTTM)  result.roe    = ratios.returnOnEquityTTM
    if (ratios.dividendYieldTTM)   result.div    = ratios.dividendYieldTTM
  }
  if (liveData && liveData.cashFlow.length > 0 && liveData.cashFlow[0].freeCashFlow) {
    result.fcf = liveData.cashFlow[0].freeCashFlow / 1e9
  }

  return result
}
