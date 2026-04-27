/**
 * Tests for the LiveData → StrategyInput adapter (Phase 4.3 boundary).
 *
 * The adapter is the single source of truth for "where does each
 * StrategyInput field come from?" — break the math contract and
 * strategies silently degenerate. These tests pin the mapping.
 */
import { describe, it, expect } from '@jest/globals'
import { liveDataToStrategyInput } from '../from-live-data'
import type { LiveData } from '../../../types'

const FULL_LIVE_DATA: LiveData = {
  profile: {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    description: '',
    mktCap: 2_800_000_000_000,
    price: 180,
    beta: 1.2,
    volAvg: 50_000_000,
    lastDiv: 0.96,
    country: 'US',
    fullTimeEmployees: '164000',
    website: 'https://apple.com',
    image: '',
    ipoDate: '1980-12-12',
    isEtf: false,
    isActivelyTrading: true,
  },
  ratios: {
    peRatioTTM: 28,
    pegRatioTTM: 2.1,
    priceToBookRatioTTM: 40,         // bvps = 180/40 = 4.5
    priceToSalesRatioTTM: 7,
    returnOnEquityTTM: 1.5,
    returnOnAssetsTTM: 0.30,
    currentRatioTTM: 0.95,
    debtToEquityTTM: 1.8,
    netProfitMarginTTM: 0.25,
    grossProfitMarginTTM: 0.45,
    operatingProfitMarginTTM: 0.30,
    dividendYieldTTM: 0.0055,
    freeCashFlowPerShareTTM: 6.5,
    priceToFreeCashFlowsRatioTTM: 28,
    enterpriseValueMultipleTTM: 22,
    returnOnCapitalEmployedTTM: 0.50,
  },
  income: [
    { date: '2024-09-30', revenue: 380e9, grossProfit: 170e9, operatingIncome: 115e9, netIncome: 95e9, eps: 6.5, ebitda: 130e9 },
    { date: '2023-09-30', revenue: 380e9, grossProfit: 170e9, operatingIncome: 110e9, netIncome: 90e9, eps: 6.0, ebitda: 125e9 },
    { date: '2022-09-30', revenue: 365e9, grossProfit: 160e9, operatingIncome: 105e9, netIncome: 87e9, eps: 5.7, ebitda: 120e9 },
  ],
  cashFlow: [
    { date: '2024-09-30', freeCashFlow: 100e9, operatingCashFlow: 110e9, capitalExpenditure: 10e9, dividendsPaid: 15e9 },
  ],
  quote: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 180,
    changesPercentage: 1.2,
    change: 2.16,
    dayLow: 178,
    dayHigh: 181,
    yearHigh: 200,
    yearLow: 160,
    marketCap: 2_800_000_000_000,
    priceAvg50: 175,
    priceAvg200: 170,
    volume: 50_000_000,
    timestamp: 1700000000,
    pe: 28,
    eps: 6.5,
    sharesOutstanding: 15_555_555_555,
  },
}

describe('liveDataToStrategyInput', () => {
  it('extracts all available fields from a complete FMP composite', () => {
    const input = liveDataToStrategyInput('AAPL', FULL_LIVE_DATA, { marketPrice: 180 })
    expect(input.ticker).toBe('AAPL')
    expect(input.marketPrice).toBe(180)
    expect(input.marketCapUSD).toBe(2_800_000_000_000)
    expect(input.sector).toBe('Technology')
    expect(input.ratios?.eps).toBe(6.5)
    expect(input.ratios?.bookValuePerShare).toBe(180 / 40)
    expect(input.ratios?.dividendYield).toBe(0.0055)
    expect(input.ratios?.peg).toBe(2.1)
    expect(input.ratios?.roe).toBe(1.5)
    expect(input.income?.netIncome).toBe(95e9)
    expect(input.income?.eps).toBe(6.5)
    expect(input.cashFlow?.freeCashFlow).toBe(100e9)
    expect(input.sharesOutstanding).toBe(15_555_555_555)
    expect(input.balanceSheet).toBeUndefined()  // FMP doesn't yet fetch balance sheet
  })

  it('uppercases the ticker', () => {
    const input = liveDataToStrategyInput('aapl', FULL_LIVE_DATA, { marketPrice: 180 })
    expect(input.ticker).toBe('AAPL')
  })

  it('passes incomeHistory through (used for CAGR derivation)', () => {
    const input = liveDataToStrategyInput('AAPL', FULL_LIVE_DATA, { marketPrice: 180 })
    expect(input.incomeHistory).toBeDefined()
    expect(input.incomeHistory).toHaveLength(3)
    expect(input.incomeHistory?.[0].netIncome).toBe(95e9)  // newest first
    expect(input.incomeHistory?.[2].netIncome).toBe(87e9)  // oldest last
  })

  it('falls back to quote.marketCap when profile.mktCap is missing', () => {
    const ld: LiveData = { ...FULL_LIVE_DATA, profile: null }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.marketCapUSD).toBe(2_800_000_000_000)
  })

  it('derives sharesOutstanding from marketCap/price when quote.sharesOutstanding missing', () => {
    const ld: LiveData = {
      ...FULL_LIVE_DATA,
      quote: { ...FULL_LIVE_DATA.quote!, sharesOutstanding: undefined },
    }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.sharesOutstanding).toBeCloseTo(2_800_000_000_000 / 180, -3)
  })

  it('returns 0 marketCap and undefined shares when both profile.mktCap and quote.marketCap missing', () => {
    const ld: LiveData = {
      ...FULL_LIVE_DATA,
      profile: null,
      quote: { ...FULL_LIVE_DATA.quote!, marketCap: 0, sharesOutstanding: undefined },
    }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.marketCapUSD).toBe(0)
    expect(input.sharesOutstanding).toBeUndefined()
  })

  it('omits ratios when liveData.ratios is null', () => {
    const ld: LiveData = { ...FULL_LIVE_DATA, ratios: null }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.ratios).toBeUndefined()
  })

  it('omits cashFlow when no annual cash-flow rows present', () => {
    const ld: LiveData = { ...FULL_LIVE_DATA, cashFlow: [] }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.cashFlow).toBeUndefined()
  })

  it('omits incomeHistory when income array is empty', () => {
    const ld: LiveData = { ...FULL_LIVE_DATA, income: [] }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.incomeHistory).toBeUndefined()
    expect(input.income).toBeUndefined()
  })

  it('omits bookValuePerShare when priceToBookRatioTTM is non-positive', () => {
    const ld: LiveData = {
      ...FULL_LIVE_DATA,
      ratios: { ...FULL_LIVE_DATA.ratios!, priceToBookRatioTTM: 0 },
    }
    const input = liveDataToStrategyInput('AAPL', ld, { marketPrice: 180 })
    expect(input.ratios?.bookValuePerShare).toBeUndefined()
  })

  it('passes earningsGrowthRate through when supplied', () => {
    const input = liveDataToStrategyInput('AAPL', FULL_LIVE_DATA, {
      marketPrice: 180,
      earningsGrowthRate: 0.12,
    })
    expect(input.earningsGrowthRate).toBe(0.12)
  })

  it('produces a StrategyInput that ownerEarningsTwoStageDCF can consume happily', async () => {
    const input = liveDataToStrategyInput('AAPL', FULL_LIVE_DATA, { marketPrice: 180 })
    const { ownerEarningsTwoStageDCF } = await import('../strategies')
    const v = ownerEarningsTwoStageDCF(input)
    expect(v.applicable).toBe(true)
    expect(v.intrinsicValueMid).not.toBeNull()
    expect(v.intrinsicValueMid).toBeGreaterThan(0)
  })
})
