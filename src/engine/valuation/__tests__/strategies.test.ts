/**
 * Tests for the per-investor valuation strategies + the STRATEGIES mapping.
 * Verifies:
 *   - Every investor ID exposed by src/constants/investors.ts has a strategy
 *     (no silent gaps; adding a new investor to the source list without a
 *     strategy here breaks this test).
 *   - Each of the 9 strategy variants behaves correctly on a happy-path input
 *     and on the degenerate inputs that should yield {applicable: false}.
 *   - The wrapper output shape (ValuationOutput) is well-formed in every case.
 */
import { describe, it, expect } from '@jest/globals'
import {
  STRATEGIES,
  valuationFor,
  ownerEarningsTwoStageDCF,
  grahamWithNCAV,
  pegBasedFairValue,
  assetFloorPlusDCF,
  aggressiveGrowthDCF,
  macroAdjustedDCF,
  magicFormulaScreen,
  deepValueScreen,
  noPerStockValuation,
} from '../strategies'
import type { StrategyInput, ValuationOutput } from '../types'
import { INVESTORS } from '../../../constants/investors'

// ── Realistic happy-path StrategyInput, AAPL-shaped ──────────────────────────
const AAPL: StrategyInput = {
  ticker: 'AAPL',
  marketPrice: 180,
  marketCapUSD: 2_800_000_000_000,  // $2.8T → large cap → 9% discount
  sector: 'Technology',
  ratios: {
    eps: 6.5,
    bookValuePerShare: 4.5,
    dividendYield: 0.0055,
    pe: 28,
    peg: 2.1,
    roe: 1.5,  // very high — Apple's leveraged buybacks
  },
  income: {
    revenue: 380_000_000_000,
    netIncome: 95_000_000_000,
    eps: 6.5,
  },
  incomeHistory: [
    { date: '2024-09-30', netIncome: 95_000_000_000 },
    { date: '2023-09-30', netIncome: 90_000_000_000 },
    { date: '2022-09-30', netIncome: 87_000_000_000 },
    { date: '2021-09-30', netIncome: 75_000_000_000 },
    { date: '2020-09-30', netIncome: 60_000_000_000 },
  ],
  cashFlow: {
    freeCashFlow: 100_000_000_000,
    operatingCashFlow: 110_000_000_000,
    capitalExpenditure: 10_000_000_000,
  },
  balanceSheet: {
    currentAssets:     150_000_000_000,
    totalLiabilities:  290_000_000_000,
    totalDebt:         110_000_000_000,
    cashAndEquivalents: 60_000_000_000,
  },
  sharesOutstanding: 15_000_000_000,
  earningsGrowthRate: 0.10,
}

// ── Sanity: wrapper output shape is always well-formed ──────────────────────
function expectValidValuationOutput(v: ValuationOutput): void {
  expect(typeof v.method).toBe('string')
  expect(typeof v.applicable).toBe('boolean')
  expect(typeof v.marketPrice).toBe('number')
  expect(Array.isArray(v.warnings)).toBe(true)
  expect(Array.isArray(v.sensitivity)).toBe(true)
  if (!v.applicable) {
    expect(v.intrinsicValueLow).toBeNull()
    expect(v.intrinsicValueMid).toBeNull()
    expect(v.intrinsicValueHigh).toBeNull()
    expect(v.marginOfSafety).toBeNull()
    expect(typeof v.inapplicableReason).toBe('string')
  }
}

// ── Coverage: every investor maps to a strategy ──────────────────────────────
describe('STRATEGIES — investor coverage', () => {
  it.each(INVESTORS.map(i => i.id))('maps investor "%s" to a strategy', (id) => {
    expect(STRATEGIES[id]).toBeDefined()
    expect(typeof STRATEGIES[id]).toBe('function')
  })

  it('has exactly 22 entries (matches the 22 investors in INVESTORS)', () => {
    expect(Object.keys(STRATEGIES).length).toBe(INVESTORS.length)
  })

  it('valuationFor falls back to ownerEarningsTwoStageDCF for unknown IDs', () => {
    const v = valuationFor('not-a-real-investor', AAPL)
    expect(v.method).toBe('Two-stage DCF on owner earnings (FCF)')
  })
})

// ── Strategy 1: ownerEarningsTwoStageDCF ─────────────────────────────────────
describe('ownerEarningsTwoStageDCF', () => {
  it('returns a positive IV for AAPL-like input', () => {
    const v = ownerEarningsTwoStageDCF(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    expect(v.intrinsicValueMid).toBeGreaterThan(0)
    expect(v.intrinsicValueLow!).toBeLessThanOrEqual(v.intrinsicValueMid!)
    expect(v.intrinsicValueHigh!).toBeGreaterThanOrEqual(v.intrinsicValueMid!)
    expect(v.sensitivity.length).toBeGreaterThan(0)
    expect(v.marginOfSafety).not.toBeNull()
  })
  it('inapplicable when FCF is missing', () => {
    const v = ownerEarningsTwoStageDCF({ ...AAPL, cashFlow: undefined })
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(false)
    expect(v.inapplicableReason).toMatch(/free cash flow/i)
  })
  it('inapplicable when FCF is negative', () => {
    const v = ownerEarningsTwoStageDCF({ ...AAPL, cashFlow: { freeCashFlow: -1_000_000 } })
    expect(v.applicable).toBe(false)
  })
  it('inapplicable when shares missing', () => {
    const v = ownerEarningsTwoStageDCF({ ...AAPL, sharesOutstanding: undefined })
    expect(v.applicable).toBe(false)
    expect(v.inapplicableReason).toMatch(/shares/i)
  })
  it('warns when growth defaults (no input growth, no income history)', () => {
    const v = ownerEarningsTwoStageDCF({ ...AAPL, earningsGrowthRate: undefined, incomeHistory: undefined })
    expect(v.applicable).toBe(true)
    expect(v.warnings.some(w => /defaulted to 8%/i.test(w))).toBe(true)
  })
  it('uses incomeHistory CAGR when earningsGrowthRate absent', () => {
    // No explicit growth → falls into resolveGrowthRate's CAGR branch.
    const v = ownerEarningsTwoStageDCF({ ...AAPL, earningsGrowthRate: undefined })
    expect(v.applicable).toBe(true)
    // Should NOT have the 8% default warning — incomeHistory is present and usable.
    expect(v.warnings.some(w => /defaulted to 8%/i.test(w))).toBe(false)
  })
})

// ── Strategy 2: grahamWithNCAV ───────────────────────────────────────────────
describe('grahamWithNCAV', () => {
  it('returns Graham + NCAV range when both available', () => {
    const v = grahamWithNCAV(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    // For AAPL, NCAV is negative (current liabilities huge), so low is negative;
    // mid is the Graham number > 0. Verify mid is a positive Graham number.
    expect(v.intrinsicValueMid!).toBeGreaterThan(0)
    expect(v.inputsUsed.grahamNumber).toBeGreaterThan(0)
  })
  it('warns when NCAV unavailable (no balance sheet)', () => {
    const v = grahamWithNCAV({ ...AAPL, balanceSheet: undefined })
    expect(v.applicable).toBe(true)
    expect(v.warnings.some(w => /NCAV unavailable/i.test(w))).toBe(true)
  })
  it('inapplicable when neither Graham nor NCAV computable', () => {
    const v = grahamWithNCAV({ ...AAPL, ratios: undefined, income: undefined, balanceSheet: undefined })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 3: pegBasedFairValue ────────────────────────────────────────────
describe('pegBasedFairValue', () => {
  it('returns a positive IV for AAPL-like input', () => {
    const v = pegBasedFairValue(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    expect(v.intrinsicValueMid!).toBeGreaterThan(0)
    expect(v.intrinsicValueLow!).toBeLessThanOrEqual(v.intrinsicValueMid!)
    expect(v.intrinsicValueHigh!).toBeGreaterThanOrEqual(v.intrinsicValueMid!)
  })
  it('inapplicable when EPS is missing or non-positive', () => {
    const noEps = pegBasedFairValue({ ...AAPL, ratios: { ...AAPL.ratios, eps: undefined }, income: { ...AAPL.income, eps: undefined } })
    expect(noEps.applicable).toBe(false)
    const negEps = pegBasedFairValue({ ...AAPL, ratios: { ...AAPL.ratios, eps: -1 } })
    expect(negEps.applicable).toBe(false)
  })
  it('inapplicable when growth+yield turn negative', () => {
    const v = pegBasedFairValue({ ...AAPL, earningsGrowthRate: -0.15, ratios: { ...AAPL.ratios, dividendYield: 0 } })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 4: assetFloorPlusDCF ────────────────────────────────────────────
describe('assetFloorPlusDCF', () => {
  it('returns a valid range when both DCF and NCAV are available', () => {
    const v = assetFloorPlusDCF(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    expect(v.intrinsicValueMid!).toBeGreaterThan(0)
  })
  it('falls back to DCF only when NCAV unavailable', () => {
    const v = assetFloorPlusDCF({ ...AAPL, balanceSheet: undefined })
    expect(v.applicable).toBe(true)
    expect(v.warnings.some(w => /NCAV floor unavailable/i.test(w))).toBe(true)
  })
  it('inapplicable when both DCF and NCAV are unavailable', () => {
    const v = assetFloorPlusDCF({ ...AAPL, cashFlow: undefined, balanceSheet: undefined })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 5: aggressiveGrowthDCF (Cathie Wood) ────────────────────────────
describe('aggressiveGrowthDCF', () => {
  it('produces a higher IV than the Buffett-style DCF (longer runway, higher growth floor)', () => {
    const buffett = ownerEarningsTwoStageDCF(AAPL)
    const wood    = aggressiveGrowthDCF(AAPL)
    expectValidValuationOutput(wood)
    expect(wood.applicable).toBe(true)
    expect(wood.intrinsicValueMid!).toBeGreaterThan(buffett.intrinsicValueMid!)
    expect(wood.inputsUsed.runwayYears).toBe(7)
  })
  it('inapplicable when FCF is missing', () => {
    const v = aggressiveGrowthDCF({ ...AAPL, cashFlow: undefined })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 6: macroAdjustedDCF (Druckenmiller, Soros) ──────────────────────
describe('macroAdjustedDCF', () => {
  it('returns a DCF with a method label that flags the macro overlay', () => {
    const v = macroAdjustedDCF(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    expect(v.method).toMatch(/macro overlay/i)
    expect(v.warnings.some(w => /macro adjustments are reflected in the narrative/i.test(w))).toBe(true)
  })
  it('preserves the underlying inapplicable result when DCF cannot run', () => {
    // Same inapplicability as the Buffett strategy when FCF is missing,
    // but the macro label + warning still apply.
    const v = macroAdjustedDCF({ ...AAPL, cashFlow: undefined })
    expect(v.applicable).toBe(false)
    expect(v.method).toMatch(/macro overlay/i)
  })
})

// ── Strategy 7: magicFormulaScreen (Greenblatt) ──────────────────────────────
describe('magicFormulaScreen', () => {
  it('returns fair value at the 10% earnings-yield price', () => {
    const v = magicFormulaScreen(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    // EPS=6.5 → fair = 65.00 → range [55.25, 74.75]
    expect(v.intrinsicValueMid).toBe(65.00)
    expect(v.warnings.some(w => /ranking screen/i.test(w))).toBe(true)
  })
  it('inapplicable when EPS is missing', () => {
    const v = magicFormulaScreen({ ...AAPL, ratios: { ...AAPL.ratios, eps: undefined }, income: { ...AAPL.income, eps: undefined } })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 8: deepValueScreen (Templeton) ──────────────────────────────────
describe('deepValueScreen', () => {
  it('produces a buy target at 50% of Graham number', () => {
    const v = deepValueScreen(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(true)
    // The mid (buyTarget) should be ~half the grahamNumber input
    expect(v.inputsUsed.buyAtFractionOfGraham).toBe(0.5)
  })
  it('inapplicable when nothing computable (no EPS, no balance sheet)', () => {
    const v = deepValueScreen({ ...AAPL, ratios: undefined, income: undefined, balanceSheet: undefined })
    expect(v.applicable).toBe(false)
  })
})

// ── Strategy 9: noPerStockValuation (Marks, Dalio) ───────────────────────────
describe('noPerStockValuation', () => {
  it('always returns inapplicable with a clear reason', () => {
    const v = noPerStockValuation(AAPL)
    expectValidValuationOutput(v)
    expect(v.applicable).toBe(false)
    expect(v.inapplicableReason).toMatch(/macro positioning|cycle awareness|risk parity/i)
  })
})

// ── Sensitivity-grid sanity: every applicable DCF strategy fills .sensitivity ──
describe('DCF strategies populate the sensitivity grid', () => {
  const dcfStrategies: [string, (input: StrategyInput) => ValuationOutput][] = [
    ['buffett',       ownerEarningsTwoStageDCF],
    ['wood',          aggressiveGrowthDCF],
    ['druckenmiller', macroAdjustedDCF],
  ]
  it.each(dcfStrategies)('%s strategy returns at least one sensitivity cell', (_label, strategy) => {
    const v = strategy(AAPL)
    expect(v.sensitivity.length).toBeGreaterThan(0)
    v.sensitivity.forEach(c => {
      expect(c.discountRate).toBeGreaterThan(c.terminalGrowth)
      expect(Number.isFinite(c.intrinsicValue)).toBe(true)
    })
  })
})
