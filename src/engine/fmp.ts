import type { LiveData, FMPProfile, FMPRatiosTTM, FMPIncomeStatement, FMPCashFlow, FMPQuote } from '../types'
import { fmtN, fmtPct, fmtB } from './utils'

/** Base URL prefix — empty in browser (Vite proxy handles it), set to 'http://localhost' in Node tests. */
const API_ORIGIN = typeof window === 'undefined' ? (process.env?.['API_BASE'] ?? '') : ''

export interface FetchLiveDataOptions {
  /** Supabase access token. The /api/fmp/* proxy is auth-gated; without it, every sub-fetch returns 401. */
  authToken?: string | null
}

/** Fetch all 5 FMP endpoints concurrently via the Express proxy. */
export async function fetchLiveData(ticker: string, opts: FetchLiveDataOptions = {}): Promise<LiveData> {
  const t = encodeURIComponent(ticker.toUpperCase())
  const base = `${API_ORIGIN}/api/fmp`
  const headers: Record<string, string> = {}
  if (opts.authToken) headers['Authorization'] = `Bearer ${opts.authToken}`

  const [profile, ratios, income, cashFlow, quote] = await Promise.allSettled([
    fetch(`${base}/profile/${t}`, { headers }).then((r) => r.json() as Promise<FMPProfile[]>),
    fetch(`${base}/ratios-ttm/${t}`, { headers }).then((r) => r.json() as Promise<FMPRatiosTTM[]>),
    fetch(`${base}/income-statement/${t}?period=annual&limit=5`, { headers }).then((r) => r.json() as Promise<FMPIncomeStatement[]>),
    fetch(`${base}/cash-flow-statement/${t}?period=annual&limit=3`, { headers }).then((r) => r.json() as Promise<FMPCashFlow[]>),
    fetch(`${base}/quote/${t}`, { headers }).then((r) => r.json() as Promise<FMPQuote[]>),
  ])

  return {
    profile:  profile.status === 'fulfilled'   && Array.isArray(profile.value)   ? (profile.value[0] ?? null)   : null,
    ratios:   ratios.status === 'fulfilled'    && Array.isArray(ratios.value)    ? (ratios.value[0] ?? null)    : null,
    income:   income.status === 'fulfilled'    && Array.isArray(income.value)    ? income.value                 : [],
    cashFlow: cashFlow.status === 'fulfilled'  && Array.isArray(cashFlow.value)  ? cashFlow.value               : [],
    quote:    quote.status === 'fulfilled'     && Array.isArray(quote.value)     ? (quote.value[0] ?? null)     : null,
  }
}

/** Assemble LiveData into a structured text block for injection into the Claude prompt. */
export function buildLiveDataBlock(live: LiveData): string {
  const lines: string[] = ['=== LIVE FINANCIAL DATA (FMP) ===']

  const { profile, ratios, income, cashFlow, quote } = live

  if (profile) {
    lines.push(
      `Company: ${profile.companyName} (${profile.symbol})`,
      `Sector: ${profile.sector} | Industry: ${profile.industry}`,
      `Market Cap: ${fmtB(profile.mktCap)} | Beta: ${fmtN(profile.beta)}`,
      `Last Dividend: $${fmtN(profile.lastDiv, 3)} | Employees: ${profile.fullTimeEmployees}`,
    )
  }

  if (quote) {
    // P/E and EPS surfaced from ratios + income blocks (stable/quote dropped them).
    // Avg volume sourced from profile.volAvg in the company line above.
    lines.push(
      ``,
      `--- Quote ---`,
      `Price: $${fmtN(quote.price)} | Change: ${fmtPct(quote.changesPercentage)}`,
      `52w High: $${fmtN(quote.yearHigh)} | 52w Low: $${fmtN(quote.yearLow)}`,
      `Volume: ${fmtB(quote.volume)}`,
    )
  }

  if (ratios) {
    lines.push(
      ``,
      `--- Ratios (TTM) ---`,
      `P/E: ${fmtN(ratios.peRatioTTM)} | PEG: ${fmtN(ratios.pegRatioTTM)}`,
      `P/B: ${fmtN(ratios.priceToBookRatioTTM)} | P/S: ${fmtN(ratios.priceToSalesRatioTTM)}`,
      `ROE: ${fmtPct(ratios.returnOnEquityTTM * 100)} | ROA: ${fmtPct(ratios.returnOnAssetsTTM * 100)}`,
      `Net Margin: ${fmtPct(ratios.netProfitMarginTTM * 100)} | Gross Margin: ${fmtPct(ratios.grossProfitMarginTTM * 100)}`,
      `Debt/Equity: ${fmtN(ratios.debtToEquityTTM)} | Current Ratio: ${fmtN(ratios.currentRatioTTM)}`,
      `Dividend Yield: ${fmtPct(ratios.dividendYieldTTM * 100)} | FCF/Share: $${fmtN(ratios.freeCashFlowPerShareTTM)}`,
    )
  }

  if (income.length > 0) {
    lines.push(``, `--- Income (Annual, last ${income.length}yr) ---`)
    income.forEach((yr) => {
      lines.push(
        `${yr.date}: Revenue ${fmtB(yr.revenue)} | Net Income ${fmtB(yr.netIncome)} | EPS $${fmtN(yr.eps)} | EBITDA ${fmtB(yr.ebitda)}`,
      )
    })
  }

  if (cashFlow.length > 0) {
    lines.push(``, `--- Cash Flow (Annual, last ${cashFlow.length}yr) ---`)
    cashFlow.forEach((yr) => {
      lines.push(
        `${yr.date}: FCF ${fmtB(yr.freeCashFlow)} | OpCF ${fmtB(yr.operatingCashFlow)} | CapEx ${fmtB(yr.capitalExpenditure)}`,
      )
    })
  }

  lines.push(``, `=== END LIVE DATA ===`)
  return lines.join('\n')
}
