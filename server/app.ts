import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import crypto from 'crypto'
import { rateLimit } from 'express-rate-limit'
import fs from 'fs'
import path from 'path'
import { attachUser } from './authMiddleware.js'
import { checkUsage, recordAnalysis, validatePromptSize, gateProvider } from './usageLimiter.js'
import { computeCostMicroCents } from './pricing.js'
import { userRouter } from './routes/userRoutes.js'
// Load affiliate map — mutable so admin routes can update it in memory.
// Resolved from CWD (repo root for both `npm start` and `jest`) so the same
// path works under tsx ESM and ts-jest CommonJS without import.meta gymnastics.
const affiliateMapPath = path.resolve(process.cwd(), 'server', 'affiliate.json')
let affiliateMap: Record<string, string> = {}
try { affiliateMap = JSON.parse(fs.readFileSync(affiliateMapPath, 'utf8')) } catch { /* no-op */ }

// Load built index.html for OG-tag injection on share routes (production only)
const distHtmlPath = path.resolve(process.cwd(), 'dist', 'index.html')
let distHtml: string | null = null
try { distHtml = fs.readFileSync(distHtmlPath, 'utf8') } catch { /* dev mode — handled via redirect */ }

export const ANTHROPIC_KEY  = process.env['ANTHROPIC_API_KEY']  ?? ''
export const GOOGLE_KEY     = process.env['GOOGLE_API_KEY']     ?? ''
export const OPENAI_KEY     = process.env['OPENAI_API_KEY']     ?? ''
export const MISTRAL_KEY    = process.env['MISTRAL_API_KEY']    ?? ''
export const FMP_KEY        = process.env['FMP_API_KEY']        ?? ''
export const FINNHUB_KEY    = process.env['FINNHUB_API_KEY']    ?? ''

/** Locked model — clients cannot override this */
const LOCKED_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2000

// ── In-memory FMP cache (1 hour TTL) ─────────────────────────────────────────
interface CacheEntry {
  data: unknown
  ts:   number
  ttl?: number    // optional per-entry override; falls back to CACHE_TTL_MS
}
export const fmpCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour

function getCached(key: string): unknown | null {
  const entry = fmpCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > (entry.ttl ?? CACHE_TTL_MS)) {
    fmpCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown, ttl?: number): void {
  fmpCache.set(key, { data, ts: Date.now(), ...(ttl !== undefined && { ttl }) })
}

// ── App ───────────────────────────────────────────────────────────────────────
export const app = express()

// Strip /api prefix when present so the same routes serve every host:
//   - Vercel:  the wrapper already strips before this fires (no-op here)
//   - Vite dev proxy: rewrites /api → / (no-op here)
//   - Railway / direct hits: client sends /api/foo, this middleware strips it
app.use((req, _res, next) => {
  if (req.url === '/api' || req.url === '/api/') req.url = '/'
  else if (req.url.startsWith('/api/')) req.url = req.url.slice(4)
  next()
})

const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173'
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'x-fmp-key', 'Authorization'],
}))

app.use(express.json({ limit: '1mb' }))

// ── Auth middleware (global — attaches req.user if valid JWT present) ─────────
 
app.use(attachUser)

// ── User routes ───────────────────────────────────────────────────────────────
app.use('/user', userRouter)

// ── Rate limiting ─────────────────────────────────────────────────────────────

const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])

/** 60 FMP data requests per minute per IP */
const fmpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: { error: 'Too many FMP requests — please try again in a minute' },
})

/** 20 LLM analysis requests per minute per IP */
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: { error: 'Too many analysis requests — please try again in a minute' },
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    claude:   Boolean(ANTHROPIC_KEY),
    gemini:   Boolean(GOOGLE_KEY),
    openai:   Boolean(OPENAI_KEY),
    mistral:  Boolean(MISTRAL_KEY),
    fmp:      Boolean(FMP_KEY),
    cacheSize: fmpCache.size,
    uptime: process.uptime(),
    time:   new Date().toISOString(),
  })
})

// ── Claude proxy ──────────────────────────────────────────────────────────────
 
app.post('/claude', llmLimiter, validatePromptSize, checkUsage, gateProvider('anthropic'), async (req: Request, res: Response) => {
  if (!ANTHROPIC_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
    return
  }

  const { prompt, ticker, investorId } = req.body as { prompt?: unknown; model?: unknown; ticker?: unknown; investorId?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOCKED_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Anthropic API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    res.json(data)

    const usage = (data as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
    const inTok  = usage?.input_tokens  ?? 0
    const outTok = usage?.output_tokens ?? 0
    recordAnalysis(req.user?.id ?? null, {
      ticker: typeof ticker === 'string' ? ticker : 'UNKNOWN',
      investorId: typeof investorId === 'string' ? investorId : 'unknown',
      result: data,
      provider: 'anthropic',
      model: LOCKED_MODEL,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsdMicro: computeCostMicroCents(LOCKED_MODEL, inTok, outTok),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Anthropic API', detail: message })
  }
})

// ── Gemini proxy ──────────────────────────────────────────────────────────────
 
app.post('/gemini', llmLimiter, validatePromptSize, checkUsage, gateProvider('google'), async (req: Request, res: Response) => {
  if (!GOOGLE_KEY) {
    res.status(503).json({ error: 'GOOGLE_API_KEY not configured on server' })
    return
  }

  const { prompt, model, ticker, investorId } = req.body as { prompt?: unknown; model?: unknown; ticker?: unknown; investorId?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']
  const geminiModel = typeof model === 'string' && ALLOWED_GEMINI_MODELS.includes(model)
    ? model
    : 'gemini-2.5-flash'

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 16384 },
        }),
      },
    )

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Gemini API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise Gemini response to match Claude's { content: [{ type, text }] } shape
    const gemini = data as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }
    const parts = gemini.candidates?.[0]?.content?.parts ?? []
    // Thinking models may prepend thought parts; grab the last non-thought text
    const textPart = [...parts].reverse().find(p => !p.thought && p.text) ?? parts[0]
    const text = textPart?.text ?? ''
    res.json({ content: [{ type: 'text', text }] })

    const inTok  = gemini.usageMetadata?.promptTokenCount      ?? 0
    const outTok = gemini.usageMetadata?.candidatesTokenCount  ?? 0
    recordAnalysis(req.user?.id ?? null, {
      ticker: typeof ticker === 'string' ? ticker : 'UNKNOWN',
      investorId: typeof investorId === 'string' ? investorId : 'unknown',
      result: { content: [{ type: 'text', text }] },
      provider: 'google',
      model: geminiModel,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsdMicro: computeCostMicroCents(geminiModel, inTok, outTok),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Gemini API', detail: message })
  }
})

// ── Yahoo Finance price proxy (no API key required) ──────────────────────────
app.get('/price/:ticker', async (req: Request, res: Response) => {
  // Yahoo index symbols start with ^ (e.g. ^GSPC, ^DJI, ^IXIC, ^RUT) — keep them.
  const ticker = (req.params['ticker'] ?? '').toUpperCase().replace(/[^A-Z0-9.^]/g, '').slice(0, 10)
  if (!ticker) {
    res.status(400).json({ error: 'ticker is required' })
    return
  }

  const cacheKey = `yahoo:${ticker}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Yahoo Finance unavailable' })
      return
    }

    const data = await upstream.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number
            chartPreviousClose?: number
            currency?: string
            shortName?: string
            exchangeName?: string
          }
        }>
        error?: { description?: string }
      }
    }

    const meta = data.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) {
      res.status(404).json({ error: `No price data found for ${ticker}` })
      return
    }

    const payload = {
      ticker,
      price:         meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose ?? 0,
      currency:      meta.currency ?? 'USD',
      shortName:     meta.shortName ?? ticker,
      exchange:      meta.exchangeName ?? '',
    }

    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: message })
  }
})

// ── Yahoo Finance historical chart data ──────────────────────────────────────
app.get('/history/:ticker', async (req: Request, res: Response) => {
  // Yahoo index symbols start with ^ (e.g. ^GSPC, ^DJI, ^IXIC, ^RUT) — keep them.
  const ticker = (req.params['ticker'] ?? '').toUpperCase().replace(/[^A-Z0-9.^]/g, '').slice(0, 10)
  const range    = ['1d','5d','1mo','3mo','6mo','1y','2y','5y','10y','15y','max'].includes(req.query['range'] as string)
    ? req.query['range'] as string
    : '1y'
  const interval = range === '1d' ? '5m'
    : range === '5d' ? '15m'
    : range === '1mo' ? '1d'
    : range === '10y' || range === '15y' || range === 'max' ? '1mo'
    : '1wk'

  if (!ticker) {
    res.status(400).json({ error: 'ticker is required' })
    return
  }

  const cacheKey = `yhist:${ticker}:${range}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  try {
    // Yahoo's `range` query param doesn't accept '15y' — synthesize via period1/period2.
    const url = (range === '15y' || range === '10y')
      ? (() => {
          const now = Math.floor(Date.now() / 1000)
          const years = range === '15y' ? 15 : 10
          const start = now - years * 365 * 24 * 60 * 60
          return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${start}&period2=${now}&interval=${interval}&events=div%2Csplit`
        })()
      : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&events=div%2Csplit`
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Yahoo Finance unavailable' })
      return
    }

    const data = await upstream.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number
            chartPreviousClose?: number
            currency?: string
          }
          timestamp?: number[]
          indicators?: {
            quote?: Array<{ close?: (number | null)[] }>
          }
        }>
      }
    }

    const result = data.chart?.result?.[0]
    if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) {
      res.status(404).json({ error: `No chart data for ${ticker}` })
      return
    }

    const timestamps = result.timestamp
    const closes     = result.indicators.quote[0].close

    const points = timestamps
      .map((ts, i) => ({ t: ts * 1000, p: closes[i] }))
      .filter((pt): pt is { t: number; p: number } => pt.p !== null && pt.p > 0)

    const payload = {
      ticker, range, points,
      currency:      result.meta?.currency          ?? 'USD',
      previousClose: result.meta?.chartPreviousClose ?? 0,
    }
    // 1d charts need fresh data during trading hours; longer ranges are stable
    setCache(cacheKey, payload, range === '1d' ? 5 * 60 * 1000 : undefined)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: message })
  }
})

// ── OpenAI proxy ─────────────────────────────────────────────────────────────
 
app.post('/openai', llmLimiter, validatePromptSize, checkUsage, gateProvider('openai'), async (req: Request, res: Response) => {
  if (!OPENAI_KEY) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured on server' })
    return
  }

  const { prompt, model, ticker, investorId } = req.body as { prompt?: unknown; model?: unknown; ticker?: unknown; investorId?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'o3-mini']
  const openaiModel = typeof model === 'string' && ALLOWED_OPENAI_MODELS.includes(model)
    ? model
    : 'gpt-4o-mini'

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'OpenAI API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise to Claude's { content: [{ type, text }] } shape
    const openai = data as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const text = openai.choices?.[0]?.message?.content ?? ''
    res.json({ content: [{ type: 'text', text }] })

    const inTok  = openai.usage?.prompt_tokens     ?? 0
    const outTok = openai.usage?.completion_tokens ?? 0
    recordAnalysis(req.user?.id ?? null, {
      ticker: typeof ticker === 'string' ? ticker : 'UNKNOWN',
      investorId: typeof investorId === 'string' ? investorId : 'unknown',
      result: { content: [{ type: 'text', text }] },
      provider: 'openai',
      model: openaiModel,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsdMicro: computeCostMicroCents(openaiModel, inTok, outTok),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach OpenAI API', detail: message })
  }
})

// ── Mistral proxy ─────────────────────────────────────────────────────────────
 
app.post('/mistral', llmLimiter, validatePromptSize, checkUsage, gateProvider('mistral'), async (req: Request, res: Response) => {
  if (!MISTRAL_KEY) {
    res.status(503).json({ error: 'MISTRAL_API_KEY not configured on server' })
    return
  }

  const { prompt, model, ticker, investorId } = req.body as { prompt?: unknown; model?: unknown; ticker?: unknown; investorId?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_MISTRAL_MODELS = ['mistral-small-3.1', 'mistral-large-2']
  const mistralModel = typeof model === 'string' && ALLOWED_MISTRAL_MODELS.includes(model)
    ? model
    : 'mistral-small-3.1'

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mistralModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Mistral API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise to Claude's { content: [{ type, text }] } shape
    const mistral = data as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const text = mistral.choices?.[0]?.message?.content ?? ''
    res.json({ content: [{ type: 'text', text }] })

    const inTok  = mistral.usage?.prompt_tokens     ?? 0
    const outTok = mistral.usage?.completion_tokens ?? 0
    recordAnalysis(req.user?.id ?? null, {
      ticker: typeof ticker === 'string' ? ticker : 'UNKNOWN',
      investorId: typeof investorId === 'string' ? investorId : 'unknown',
      result: { content: [{ type: 'text', text }] },
      provider: 'mistral',
      model: mistralModel,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsdMicro: computeCostMicroCents(mistralModel, inTok, outTok),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Mistral API', detail: message })
  }
})

// ── Symbol search (Finnhub) ──────────────────────────────────────────────────
app.get('/search', fmpLimiter, async (req: Request, res: Response) => {
  if (!FINNHUB_KEY) {
    res.status(503).json({ results: [] })
    return
  }

  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim().slice(0, 50) : ''
  if (!q) { res.json({ results: [] }); return }

  const cacheKey = `search:${q.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached !== null) { res.set('X-Cache', 'HIT').json(cached); return }

  try {
    const upstream = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`)
    if (!upstream.ok) { res.json({ results: [] }); return }

    const raw = await upstream.json() as { result?: Array<{ symbol: string; description: string; type: string }> }
    const results = (raw.result ?? [])
      .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.'))
      .slice(0, 6)
      .map(r => ({ symbol: r.symbol, name: r.description }))

    const payload = { results }
    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS').json(payload)
  } catch {
    res.json({ results: [] })
  }
})

// ── News feed (Finnhub) ───────────────────────────────────────────────────────
app.get('/news', fmpLimiter, async (req: Request, res: Response) => {
  if (!FINNHUB_KEY) {
    res.status(503).json({ error: 'FINNHUB_API_KEY not configured' })
    return
  }

  const ticker = typeof req.query['ticker'] === 'string'
    ? req.query['ticker'].replace(/[^A-Z0-9.]/gi, '').toUpperCase().slice(0, 10)
    : ''
  const page = Math.max(0, parseInt(String(req.query['page'] ?? '0'), 10))

  const cacheKey = `finnhub:${ticker || 'general'}:${page}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  let url: string
  if (ticker) {
    // Each page covers a 30-day window, shifted back by page number
    const to   = new Date(); to.setDate(to.getDate() - page * 30)
    const from = new Date(to); from.setDate(from.getDate() - 30)
    const toStr   = to.toISOString().split('T')[0]
    const fromStr = from.toISOString().split('T')[0]
    url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromStr}&to=${toStr}&token=${FINNHUB_KEY}`
  } else {
    url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`
  }

  try {
    const upstream = await fetch(url)

    if (upstream.status === 401 || upstream.status === 403) {
      res.status(403).json({ error: 'Invalid Finnhub API key' })
      return
    }
    if (!upstream.ok) throw new Error(`Finnhub ${upstream.status}`)

    const raw: unknown = await upstream.json()
    if (!Array.isArray(raw)) throw new Error('Unexpected Finnhub response format')

    type FinnhubItem = {
      headline?: string; summary?: string; url?: string; image?: string
      source?: string; datetime?: number; related?: string
    }

    const filtered = (raw as FinnhubItem[]).filter(a => a.headline && a.url)
    const slice    = filtered.slice(page === 0 && !ticker ? 0 : 0, 20)

    const articles = slice.map(a => ({
      title:         String(a.headline ?? ''),
      text:          String(a.summary  ?? ''),
      url:           String(a.url      ?? ''),
      image:         String(a.image    ?? ''),
      site:          String(a.source   ?? ''),
      publishedDate: a.datetime
        ? new Date(a.datetime * 1000).toISOString()
        : new Date().toISOString(),
      tickers: a.related ? a.related.split(',').map(t => t.trim()).filter(Boolean) : [],
    }))

    // For ticker news: more pages available if this window had articles
    // For general news: Finnhub returns up to 100 items in one shot — no more pages
    const hasMore = ticker ? filtered.length >= 20 : false

    const payload = { articles, page, hasMore }
    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to fetch news', detail: message })
  }
})

// ── Market movers (gainers + losers) ─────────────────────────────────────────
// FMP stable API response shape (v3/stock/gainers was deprecated Aug 2025)
interface FMPMoverRaw {
  symbol?: string
  name?:   string
  price?:  number
  change?: number
  changesPercentage?: number
  exchange?: string
}
interface Mover {
  symbol:            string
  name:              string
  price:             number
  change:            number
  changesPercentage: number
  exchange:          string
}

app.get('/market-movers', fmpLimiter, async (req: Request, res: Response) => {
  const clientKey = typeof req.headers['x-fmp-key'] === 'string' ? req.headers['x-fmp-key'] : ''
  const key = FMP_KEY || clientKey
  if (!key) { res.status(503).json({ error: 'No FMP API key available — enter your key via the Live Data button' }); return }

  const cacheKey = 'market-movers'
  const cached = getCached(cacheKey)
  if (cached !== null) { res.set('X-Cache', 'HIT').json(cached); return }

  // Use stable/ base — v3/stock/gainers and v3/stock/losers were deprecated Aug 2025
  const base = 'https://financialmodelingprep.com/stable'
  try {
    const [gr, lr] = await Promise.allSettled([
      fetch(`${base}/biggest-gainers?apikey=${key}`),
      fetch(`${base}/biggest-losers?apikey=${key}`),
    ])
    type FetchResult = PromiseSettledResult<Awaited<ReturnType<typeof fetch>>>
    const parse = async (r: FetchResult): Promise<FMPMoverRaw[]> => {
      if (r.status === 'rejected' || !r.value.ok) return []
      const d = await r.value.json() as unknown
      if (Array.isArray(d)) return d as FMPMoverRaw[]
      return []
    }
    const [rawG, rawL] = await Promise.all([parse(gr), parse(lr)])
    const toMover = (r: FMPMoverRaw): Mover => ({
      symbol:            r.symbol            ?? '',
      name:              r.name              ?? '',
      price:             r.price             ?? 0,
      change:            r.change            ?? 0,
      changesPercentage: r.changesPercentage ?? 0,
      exchange:          r.exchange          ?? '',
    })
    const payload = { gainers: rawG.slice(0, 10).map(toMover), losers: rawL.slice(0, 10).map(toMover) }
    setCache(cacheKey, payload, 5 * 60 * 1000)
    res.set('X-Cache', 'MISS').json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to fetch market movers', detail: message })
  }
})

// ── FMP proxy ─────────────────────────────────────────────────────────────────
// Migrated Aug 2025: v3 endpoints retired for keys issued after 2025-08-31.
// Each endpoint maps to its stable/ equivalent and (where shape diverged) is
// normalized back to the v3-shaped JSON the client + types still expect.

interface FMPRecord { [k: string]: unknown }
function isObj(x: unknown): x is FMPRecord { return typeof x === 'object' && x !== null && !Array.isArray(x) }
function rename(obj: FMPRecord, from: string, to: string): void {
  if (Object.hasOwn(obj, from) && !Object.hasOwn(obj, to)) {
    obj[to] = obj[from]; delete obj[from]
  }
}

async function fetchStable(endpoint: string, params: Record<string, string>, key: string): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, apikey: key }).toString()
  const upstream = await fetch(`https://financialmodelingprep.com/stable/${endpoint}?${qs}`)
  if (!upstream.ok) {
    const detail = upstream.statusText
    const err = new Error(`FMP ${upstream.status} ${detail}`) as Error & { status?: number }
    err.status = upstream.status
    throw err
  }
  return upstream.json()
}

function normalizeProfile(data: unknown): unknown {
  if (!Array.isArray(data)) return data
  return data.map((row) => {
    if (!isObj(row)) return row
    const r = { ...row }
    rename(r, 'marketCap', 'mktCap')
    rename(r, 'lastDividend', 'lastDiv')
    rename(r, 'averageVolume', 'volAvg')
    return r
  })
}

function normalizeQuote(data: unknown): unknown {
  if (!Array.isArray(data)) return data
  return data.map((row) => {
    if (!isObj(row)) return row
    const r = { ...row }
    rename(r, 'changePercentage', 'changesPercentage')
    return r
  })
}

/** stable/ratios-ttm + stable/key-metrics-ttm merged, then normalized back to v3 keys. */
function normalizeRatios(ratiosData: unknown, metricsData: unknown): unknown {
  const ratios = Array.isArray(ratiosData) && isObj(ratiosData[0]) ? { ...ratiosData[0] } : null
  const metrics = Array.isArray(metricsData) && isObj(metricsData[0]) ? metricsData[0] : null
  if (!ratios) return []
  // key-metrics-ttm carries returnOnEquityTTM / returnOnAssetsTTM that ratios-ttm dropped
  if (metrics) {
    if (Object.hasOwn(metrics, 'returnOnEquityTTM')) ratios['returnOnEquityTTM'] = metrics['returnOnEquityTTM']
    if (Object.hasOwn(metrics, 'returnOnAssetsTTM')) ratios['returnOnAssetsTTM'] = metrics['returnOnAssetsTTM']
    if (!Object.hasOwn(ratios, 'returnOnCapitalEmployedTTM') && Object.hasOwn(metrics, 'returnOnCapitalEmployedTTM')) {
      ratios['returnOnCapitalEmployedTTM'] = metrics['returnOnCapitalEmployedTTM']
    }
  }
  rename(ratios, 'priceToEarningsRatioTTM', 'peRatioTTM')
  rename(ratios, 'priceToEarningsGrowthRatioTTM', 'pegRatioTTM')
  rename(ratios, 'debtToEquityRatioTTM', 'debtToEquityTTM')
  rename(ratios, 'priceToFreeCashFlowRatioTTM', 'priceToFreeCashFlowsRatioTTM')
  return [ratios]
}

const ALLOWED_FMP_PATHS = new Set([
  'profile', 'ratios-ttm', 'income-statement',
  'cash-flow-statement', 'quote', 'stock/list',
])

app.get('/fmp/*', fmpLimiter, async (req: Request, res: Response) => {
  const clientKey = typeof req.headers['x-fmp-key'] === 'string' ? req.headers['x-fmp-key'] : ''
  const effectiveFmpKey = FMP_KEY || clientKey
  if (!effectiveFmpKey) {
    res.status(503).json({ error: 'No FMP API key available — enter your key via the Live Data button' })
    return
  }

  const fmpPath = req.params[0] as string
  // Path shape: <endpoint>/<ticker>  OR  stock/list
  const isStockList = fmpPath === 'stock/list'
  const slash = fmpPath.indexOf('/')
  const endpoint = isStockList ? 'stock/list' : (slash >= 0 ? fmpPath.slice(0, slash) : fmpPath)
  const ticker = isStockList ? '' : (slash >= 0 ? fmpPath.slice(slash + 1) : '')

  if (!ALLOWED_FMP_PATHS.has(endpoint)) {
    res.status(400).json({ error: 'Invalid FMP endpoint' })
    return
  }

  // Cache key includes endpoint + ticker + period/limit so concurrent endpoints don't collide
  const cacheKey = `fmp:${endpoint}:${ticker}:${new URLSearchParams(req.query as Record<string, string>).toString()}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  const period = typeof req.query['period'] === 'string' ? req.query['period'] : ''
  const limit  = typeof req.query['limit']  === 'string' ? req.query['limit']  : ''
  const symbolParam: Record<string, string> = ticker ? { symbol: ticker } : {}

  try {
    let payload: unknown
    switch (endpoint) {
      case 'profile':
        payload = normalizeProfile(await fetchStable('profile', symbolParam, effectiveFmpKey))
        break
      case 'quote':
        payload = normalizeQuote(await fetchStable('quote', symbolParam, effectiveFmpKey))
        break
      case 'ratios-ttm': {
        // Merge ratios-ttm + key-metrics-ttm so client gets ROE/ROA in one shape
        const [ratios, metrics] = await Promise.all([
          fetchStable('ratios-ttm', symbolParam, effectiveFmpKey),
          fetchStable('key-metrics-ttm', symbolParam, effectiveFmpKey).catch(() => null),
        ])
        payload = normalizeRatios(ratios, metrics)
        break
      }
      case 'income-statement': {
        const params: Record<string, string> = { ...symbolParam }
        if (period) params['period'] = period
        if (limit)  params['limit']  = limit
        payload = await fetchStable('income-statement', params, effectiveFmpKey)
        break
      }
      case 'cash-flow-statement': {
        const params: Record<string, string> = { ...symbolParam }
        if (period) params['period'] = period
        if (limit)  params['limit']  = limit
        payload = await fetchStable('cash-flow-statement', params, effectiveFmpKey)
        break
      }
      case 'stock/list':
        payload = await fetchStable('stock-list', {}, effectiveFmpKey)
        break
      default:
        res.status(400).json({ error: 'Invalid FMP endpoint' })
        return
    }
    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const e = err as Error & { status?: number }
    if (typeof e.status === 'number') {
      res.status(e.status).json({ error: 'FMP API error', detail: e.message })
      return
    }
    res.status(502).json({ error: 'Failed to reach FMP API', detail: e.message ?? 'Unknown error' })
  }
})

// ── Default OG image ─────────────────────────────────────────────────────────
// Served at /og-default.png so the URL is stable; content is SVG (widely accepted by crawlers)
const ogImagePath = path.resolve(process.cwd(), 'public', 'og-default.svg')
app.get('/og-default.png', (_req: Request, res: Response) => {
  res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'public, max-age=86400').sendFile(ogImagePath)
})

// ── Affiliate link redirect ───────────────────────────────────────────────────
// /api/link?url=<encoded-url> → 302 to destination with affiliate params appended
// Only allows redirects to domains in the affiliate allowlist to prevent open redirect attacks
app.get('/link', (req: Request, res: Response) => {
  const raw = typeof req.query['url'] === 'string' ? req.query['url'] : ''
  if (!raw) { res.status(400).end(); return }
  let url: URL
  try { url = new URL(decodeURIComponent(raw)) } catch { res.status(400).end(); return }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') { res.status(400).end(); return }
  const hostname = url.hostname.replace(/^www\./, '')
  // Only allow redirects to domains in the affiliate map (prevents open redirect vulnerability)
  if (!Object.hasOwn(affiliateMap, hostname)) {
    res.status(403).json({ error: 'Domain not in allowlist' }); return
  }
  const affix = affiliateMap[hostname] ?? ''
  const final = affix ? url.toString() + affix : url.toString()
  res.redirect(302, final)
})

// ── Share routes (OG meta tag injection) ─────────────────────────────────────
// /share/:ticker/:investorId  → serves index.html with injected OG tags (prod)
//                             → redirects to /?share=TICKER/investorId (dev)
const INVESTOR_NAMES: Record<string, string> = {
  buffett: 'Warren Buffett', graham: 'Benjamin Graham', lynch: 'Peter Lynch',
  munger: 'Charlie Munger', dalio: 'Ray Dalio', ackman: 'Bill Ackman',
  greenblatt: 'Joel Greenblatt', templeton: 'John Templeton', marks: 'Howard Marks',
  klarman: 'Seth Klarman', pabrai: 'Mohnish Pabrai', wood: 'Cathie Wood',
  fisher: 'Philip Fisher', druckenmiller: 'Stan Druckenmiller', soros: 'George Soros',
  burry: 'Michael Burry', smith: 'Terry Smith', einhorn: 'David Einhorn',
  miller: 'Bill Miller', watsa: 'Prem Watsa', lilu: 'Li Lu', schloss: 'Walter Schloss',
}

function injectOgTags(html: string, title: string, desc: string, globals: string, imgUrl: string, canonicalUrl: string): string {
  const t = title.replace(/"/g, '&quot;')
  const d = desc.replace(/"/g, '&quot;')
  return html.replace(
    '</head>',
    `<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${imgUrl}" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${imgUrl}" />
<script>${globals}</script>
</head>`,
  )
}

app.get('/share/:ticker/:investorId', (req: Request, res: Response) => {
  const ticker     = (req.params['ticker']     ?? '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10)
  const investorId = (req.params['investorId'] ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (!ticker || !investorId) { res.status(400).end(); return }

  const name  = INVESTOR_NAMES[investorId] ?? investorId
  const title = `${ticker} × ${name} | Stratalyx`
  const desc  = `${name} framework applied to ${ticker} — AI-generated investment analysis. Educational use only.`

  if (distHtml) {
    const base    = `${req.protocol}://${req.get('host')}`
    const imgUrl  = `${base}/og-default.png`
    const canonicalUrl = `${base}/share/${ticker}/${investorId}`
    const globals = `window.__SHARE_TICKER__=${JSON.stringify(ticker)};window.__SHARE_INVESTOR__=${JSON.stringify(investorId)};`
    res.set('Content-Type', 'text/html').send(injectOgTags(distHtml, title, desc, globals, imgUrl, canonicalUrl))
  } else {
    res.redirect(`/?share=${encodeURIComponent(ticker)}/${encodeURIComponent(investorId)}`)
  }
})

app.get('/share/comparison/:ticker/:investors', (req: Request, res: Response) => {
  const ticker    = (req.params['ticker']    ?? '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10)
  const investors = (req.params['investors'] ?? '').toLowerCase().replace(/[^a-z,]/g, '')
  if (!ticker || !investors) { res.status(400).end(); return }

  const names = investors.split(',').map(id => INVESTOR_NAMES[id] ?? id).join(' vs ')
  const title = `${ticker}: ${names} | Stratalyx`
  const desc  = `Compare ${names} frameworks on ${ticker} — AI-generated side-by-side analysis. Educational use only.`

  if (distHtml) {
    const base    = `${req.protocol}://${req.get('host')}`
    const imgUrl  = `${base}/og-default.png`
    const canonicalUrl = `${base}/share/comparison/${ticker}/${investors}`
    const globals = `window.__SHARE_COMPARISON__=${JSON.stringify({ ticker, investors })};`
    res.set('Content-Type', 'text/html').send(injectOgTags(distHtml, title, desc, globals, imgUrl, canonicalUrl))
  } else {
    res.redirect(`/?comparison=${encodeURIComponent(ticker)}/${encodeURIComponent(investors)}`)
  }
})

// ── Admin routes (Basic Auth) ─────────────────────────────────────────────────
const ADMIN_PASS = process.env['ADMIN_PASSWORD'] ?? ''

/** 10 admin requests per minute per IP to prevent brute-force */
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: { error: 'Too many admin requests — please try again in a minute' },
})

/** Timing-safe password comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_PASS) { res.status(503).json({ error: 'Admin not configured — set ADMIN_PASSWORD in .env' }); return }
  const auth = req.headers['authorization'] ?? ''
  const b64  = auth.startsWith('Basic ') ? auth.slice(6) : ''
  const decoded = Buffer.from(b64, 'base64').toString('utf8')
  const pass = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : ''
  if (!safeCompare(pass, ADMIN_PASS)) {
    res.set('WWW-Authenticate', 'Basic realm="Stratalyx Admin"').status(401).end(); return
  }
  next()
}

app.get('/admin/affiliate', adminLimiter, adminAuth, (_req: Request, res: Response) => {
  res.json(affiliateMap)
})

app.put('/admin/affiliate', adminLimiter, adminAuth, express.json(), async (req: Request, res: Response) => {
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Body must be a JSON object' }); return
  }
  // Validate all values are strings
  for (const [, v] of Object.entries(req.body)) {
    if (typeof v !== 'string') {
      res.status(400).json({ error: 'All values must be strings' }); return
    }
  }
  try {
    const updated = req.body as Record<string, string>
    await fs.promises.writeFile(affiliateMapPath, JSON.stringify(updated, null, 2), 'utf8')
    // Update in-memory map
    Object.keys(affiliateMap).forEach(k => delete affiliateMap[k])
    Object.assign(affiliateMap, updated)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Failed to save', detail: String(e) })
  }
})

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
})
