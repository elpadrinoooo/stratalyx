/**
 * Tests for the shared helpers in server/valuation/helpers.ts.
 * The math primitives (DCF/Graham/Lynch) have their own dedicated suites.
 * This file covers the cross-cutting utilities: clamp, round, defaultDiscountRate,
 * ownerEarnings, netDebt, buildSensitivityGrid, marginOfSafety, impliedGrowthRate.
 */
import { describe, it, expect } from '@jest/globals'
import fc from 'fast-check'
import {
  clamp,
  round,
  defaultDiscountRate,
  ownerEarnings,
  netDebt,
  buildSensitivityGrid,
  marginOfSafety,
  impliedGrowthRate,
} from '../helpers'

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps below min', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })
  it('clamps above max', () => {
    expect(clamp(11, 0, 10)).toBe(10)
  })
  it('returns min on NaN', () => {
    expect(clamp(NaN, 0, 10)).toBe(0)
  })
  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(0,  -10, -1)).toBe(-1)
    expect(clamp(-20, -10, -1)).toBe(-10)
  })
})

describe('round', () => {
  it('rounds to 2 dp by default', () => {
    // Avoid 1.005 — IEEE 754 stores it as 1.00499..., which Math.round
    // legitimately rounds down. Tests that hit binary-representable values
    // for clean assertions.
    expect(round(1.236)).toBe(1.24)
    expect(round(1.234)).toBe(1.23)
  })
  it('respects places argument', () => {
    expect(round(1.23456, 4)).toBe(1.2346)
    expect(round(1.23456, 0)).toBe(1)
  })
  it('returns 0 for non-finite', () => {
    expect(round(NaN)).toBe(0)
    expect(round(Infinity)).toBe(0)
    expect(round(-Infinity)).toBe(0)
  })
})

describe('defaultDiscountRate', () => {
  it('returns 9% for large caps (>= $10B)', () => {
    expect(defaultDiscountRate(10_000_000_000)).toBe(0.09)
    expect(defaultDiscountRate(100_000_000_000)).toBe(0.09)
  })
  it('returns 11% for mid caps (>= $2B, < $10B)', () => {
    expect(defaultDiscountRate(2_000_000_000)).toBe(0.11)
    expect(defaultDiscountRate(5_000_000_000)).toBe(0.11)
  })
  it('returns 13% for small caps (< $2B)', () => {
    expect(defaultDiscountRate(500_000_000)).toBe(0.13)
    expect(defaultDiscountRate(1)).toBe(0.13)
  })
  it('returns 11% as a safe default for non-finite or non-positive', () => {
    expect(defaultDiscountRate(NaN)).toBe(0.11)
    expect(defaultDiscountRate(0)).toBe(0.11)
    expect(defaultDiscountRate(-1)).toBe(0.11)
  })
})

describe('ownerEarnings', () => {
  it('returns FCF when positive', () => {
    expect(ownerEarnings({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, cashFlow: { freeCashFlow: 1_000_000 } })).toBe(1_000_000)
  })
  it('returns null on missing cashFlow', () => {
    expect(ownerEarnings({ ticker: 'X', marketPrice: 1, marketCapUSD: 1 })).toBeNull()
  })
  it('returns null on non-positive FCF', () => {
    expect(ownerEarnings({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, cashFlow: { freeCashFlow: 0 } })).toBeNull()
    expect(ownerEarnings({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, cashFlow: { freeCashFlow: -100 } })).toBeNull()
  })
  it('returns null on non-finite FCF', () => {
    expect(ownerEarnings({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, cashFlow: { freeCashFlow: NaN } })).toBeNull()
  })
})

describe('netDebt', () => {
  it('returns debt minus cash when both present', () => {
    expect(netDebt({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, balanceSheet: { totalDebt: 100, cashAndEquivalents: 30 } })).toBe(70)
  })
  it('returns 0 when balance sheet missing', () => {
    expect(netDebt({ ticker: 'X', marketPrice: 1, marketCapUSD: 1 })).toBe(0)
  })
  it('floors at 0 when cash exceeds debt (net cash position)', () => {
    expect(netDebt({ ticker: 'X', marketPrice: 1, marketCapUSD: 1, balanceSheet: { totalDebt: 50, cashAndEquivalents: 200 } })).toBe(0)
  })
})

describe('buildSensitivityGrid', () => {
  it('produces up to 9 cells around the base point', () => {
    const cells = buildSensitivityGrid(0.10, 0.025, (dr, tg) => 100 + dr * 100 - tg * 100)
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.length).toBeLessThanOrEqual(9)
  })
  it('skips degenerate cells where dr <= tg', () => {
    // base dr=0.025, tg=0.025 → all 9 cells potentially degenerate
    const cells = buildSensitivityGrid(0.025, 0.025, (dr) => dr * 1000)
    cells.forEach(c => expect(c.discountRate).toBeGreaterThan(c.terminalGrowth))
  })
  it('returns rounded discountRate, terminalGrowth, intrinsicValue', () => {
    const cells = buildSensitivityGrid(0.10, 0.025, () => 123.456789)
    cells.forEach(c => {
      expect(c.intrinsicValue).toBe(123.46)
    })
  })
})

describe('marginOfSafety', () => {
  it('returns positive when IV exceeds price (undervalued)', () => {
    expect(marginOfSafety(120, 100)).toBe(0.20)
  })
  it('returns negative when IV below price (overvalued)', () => {
    expect(marginOfSafety(80, 100)).toBe(-0.20)
  })
  it('returns null on null IV', () => {
    expect(marginOfSafety(null, 100)).toBeNull()
  })
  it('returns null on non-positive market price', () => {
    expect(marginOfSafety(100, 0)).toBeNull()
    expect(marginOfSafety(100, -1)).toBeNull()
  })
  it('returns null on non-finite IV', () => {
    expect(marginOfSafety(NaN, 100)).toBeNull()
    expect(marginOfSafety(Infinity, 100)).toBeNull()
  })
})

describe('impliedGrowthRate', () => {
  it('computes CAGR over 4-year history (newest first per FMP)', () => {
    // 100 → 200 over 3 years (4 entries) ⇒ CAGR = 2^(1/3) - 1 ≈ 0.2599
    // But the function clamps to [-0.20, 0.20], so we expect 0.20.
    const result = impliedGrowthRate([
      { netIncome: 200 },
      { netIncome: 160 },
      { netIncome: 130 },
      { netIncome: 100 },
    ])
    expect(result).toBe(0.20)
  })
  it('returns a real CAGR within the clamp band', () => {
    // 100 → 110 over 1 year (2 entries) ⇒ CAGR = 0.10
    const result = impliedGrowthRate([{ netIncome: 110 }, { netIncome: 100 }])
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0.10, 5)
  })
  it('clamps negative CAGR at -0.20', () => {
    const result = impliedGrowthRate([{ netIncome: 10 }, { netIncome: 100 }])
    expect(result).toBe(-0.20)
  })
  it('returns null on fewer than 2 entries', () => {
    expect(impliedGrowthRate([])).toBeNull()
    expect(impliedGrowthRate([{ netIncome: 100 }])).toBeNull()
    expect(impliedGrowthRate(undefined)).toBeNull()
  })
  it('returns null when oldest or newest is non-positive', () => {
    expect(impliedGrowthRate([{ netIncome: 100 }, { netIncome: 0 }])).toBeNull()
    expect(impliedGrowthRate([{ netIncome: 100 }, { netIncome: -50 }])).toBeNull()
  })
  it('returns null when entries lack netIncome', () => {
    expect(impliedGrowthRate([{}, {}])).toBeNull()
  })

  it('property: result is always in [-0.20, 0.20] when non-null', () => {
    fc.assert(fc.property(
      fc.array(
        fc.double({ min: 0.01, max: 1e10, noNaN: true, noDefaultInfinity: true }),
        { minLength: 2, maxLength: 10 },
      ),
      (incomes) => {
        const history = incomes.map(n => ({ netIncome: n }))
        const r = impliedGrowthRate(history)
        if (r === null) return true
        return r >= -0.20 && r <= 0.20
      },
    ), { numRuns: 100 })
  })
})
