/**
 * Adapter: FMP composite (LiveData) → valuation engine StrategyInput.
 *
 * The valuation primitives don't know anything about FMP — they take a clean
 * StrategyInput. This is the boundary that maps the FMP shape into that
 * input, with sensible defaults when fields are missing. Single source of
 * truth for the mapping: any future "where does growthRate come from?"
 * question gets answered here.
 *
 * NB: balance-sheet fields stay undefined for now — FMP's currently proxied
 * endpoints don't include the balance-sheet-statement. Strategies that need
 * NCAV (Graham, Klarman, Templeton) gracefully degrade. Phase 3.2 expands
 * the FMP service to fetch balance sheet, at which point this adapter
 * starts populating those fields.
 */

import type { LiveData } from '../../types'
import type { StrategyInput } from './types.js'

export interface LiveDataAdapterOptions {
  /** Current market price per share. From FMP quote or Yahoo fallback. */
  marketPrice: number
  /** Pre-derived earnings growth rate (decimal, optional). When absent, strategies fall back to incomeHistory CAGR or 8%. */
  earningsGrowthRate?: number
}

/** Build a StrategyInput from FMP composite data + a known market price. */
export function liveDataToStrategyInput(
  ticker: string,
  liveData: LiveData,
  opts: LiveDataAdapterOptions,
): StrategyInput {
  const profile  = liveData.profile
  const quote    = liveData.quote
  const ratios   = liveData.ratios
  const income   = liveData.income[0]
  const cashFlow = liveData.cashFlow[0]

  // Market cap: profile.mktCap is the canonical source. Quote.marketCap is a
  // backup when profile is missing. Both are absolute USD values.
  const marketCapUSD =
    (typeof profile?.mktCap === 'number' && profile.mktCap > 0) ? profile.mktCap
    : (typeof quote?.marketCap === 'number' && quote.marketCap > 0) ? quote.marketCap
    : 0

  // Shares: prefer the quote's sharesOutstanding (more precise). Otherwise
  // back-derive from marketCap / price.
  const sharesFromQuote = quote?.sharesOutstanding
  const sharesDerived =
    marketCapUSD > 0 && opts.marketPrice > 0
      ? marketCapUSD / opts.marketPrice
      : undefined
  const sharesOutstanding =
    typeof sharesFromQuote === 'number' && sharesFromQuote > 0
      ? sharesFromQuote
      : sharesDerived

  // Book value per share: ratios doesn't expose it directly. Derive from
  // ratios.priceToBookRatioTTM if both that and price are usable.
  const bookValuePerShare =
    ratios && ratios.priceToBookRatioTTM > 0 && opts.marketPrice > 0
      ? opts.marketPrice / ratios.priceToBookRatioTTM
      : undefined

  return {
    ticker: ticker.toUpperCase(),
    marketPrice: opts.marketPrice,
    marketCapUSD,
    sector: profile?.sector,
    ratios: ratios ? {
      eps: quote?.eps ?? income?.eps,
      bookValuePerShare,
      dividendYield: ratios.dividendYieldTTM,
      pe: ratios.peRatioTTM,
      peg: ratios.pegRatioTTM,
      roe: ratios.returnOnEquityTTM,
    } : undefined,
    income: income ? {
      revenue: income.revenue,
      netIncome: income.netIncome,
      eps: income.eps,
    } : undefined,
    incomeHistory: liveData.income.length > 0
      ? liveData.income.map(yr => ({
          date: yr.date,
          netIncome: yr.netIncome,
          eps: yr.eps,
          revenue: yr.revenue,
        }))
      : undefined,
    cashFlow: cashFlow ? {
      freeCashFlow: cashFlow.freeCashFlow,
      operatingCashFlow: cashFlow.operatingCashFlow,
      capitalExpenditure: cashFlow.capitalExpenditure,
    } : undefined,
    // balanceSheet intentionally omitted — FMP service doesn't fetch it yet.
    sharesOutstanding,
    earningsGrowthRate: opts.earningsGrowthRate,
  }
}
