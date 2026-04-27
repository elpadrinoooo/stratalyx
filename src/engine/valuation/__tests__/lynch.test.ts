/**
 * @jest-environment node
 *
 * Tests for the Peter Lynch PEG-based fair value primitive.
 *
 * Pure-math primitive — no mocks, no fixtures. Every test is a closed-form
 * assertion against the Lynch heuristic:
 *
 *     fairPE  = clamp(growth%% + yield%%, 0, 30)
 *     fairValue = fairPE * EPS
 *
 * with null returned for non-positive EPS, non-positive fairPE, or any
 * non-finite input.
 */
import { describe, it, expect } from '@jest/globals'
import fc from 'fast-check'

import { lynchFairValue } from '../lynch'

describe('lynchFairValue — happy path', () => {
  it('A. DNKN ("buy what you know") produces 49.60', () => {
    // EPS = 3.20, growth = 13%, yield = 2.5%
    // fairPE = 13 + 2.5 = 15.5  →  fairValue = 15.5 * 3.20 = 49.60
    const value = lynchFairValue({
      eps: 3.20,
      earningsGrowthRate: 0.13,
      dividendYield: 0.025,
    })
    expect(value).toBe(49.60)
  })

  it('B. caps fairPE at 30 for high-growth names (50% growth, no yield)', () => {
    // Without cap: 50 * 1 = 50.00; with cap: 30 * 1 = 30.00
    const value = lynchFairValue({
      eps: 1.0,
      earningsGrowthRate: 0.50,
      dividendYield: 0,
    })
    expect(value).toBe(30.00)
  })

  it('B′. cap engages exactly at the 30 boundary', () => {
    // 28% + 2% = 30 exactly → fair value = 30 * EPS
    const value = lynchFairValue({
      eps: 2,
      earningsGrowthRate: 0.28,
      dividendYield: 0.02,
    })
    expect(value).toBe(60.00)
  })

  it('reproduces the third spec example (negative growth swamps to null)', () => {
    // EPS=3, growth=-5%, yield=1% → fairPE = -4 → null
    expect(lynchFairValue({
      eps: 3,
      earningsGrowthRate: -0.05,
      dividendYield: 0.01,
    })).toBeNull()
  })
})

describe('lynchFairValue — null guards', () => {
  it('C. returns null on negative EPS', () => {
    expect(lynchFairValue({ eps: -1, earningsGrowthRate: 0.10, dividendYield: 0.02 })).toBeNull()
  })

  it('C. returns null on zero EPS', () => {
    expect(lynchFairValue({ eps: 0, earningsGrowthRate: 0.10, dividendYield: 0.02 })).toBeNull()
  })

  it('C. returns null on NaN EPS', () => {
    expect(lynchFairValue({ eps: NaN, earningsGrowthRate: 0.10, dividendYield: 0.02 })).toBeNull()
  })

  it('D. returns null when fairPE comes out negative', () => {
    // growth = -5%, yield = 0  →  fairPE = -5 → null
    expect(lynchFairValue({ eps: 10, earningsGrowthRate: -0.05, dividendYield: 0 })).toBeNull()
  })

  it('E. returns null when fairPE is exactly 0', () => {
    expect(lynchFairValue({ eps: 10, earningsGrowthRate: 0, dividendYield: 0 })).toBeNull()
  })

  it('F. returns null on NaN earningsGrowthRate', () => {
    expect(lynchFairValue({ eps: 5, earningsGrowthRate: NaN, dividendYield: 0.02 })).toBeNull()
  })

  it('F. returns null on NaN dividendYield', () => {
    expect(lynchFairValue({ eps: 5, earningsGrowthRate: 0.10, dividendYield: NaN })).toBeNull()
  })

  it('F. returns null on Infinity earningsGrowthRate', () => {
    expect(lynchFairValue({ eps: 5, earningsGrowthRate: Infinity, dividendYield: 0.02 })).toBeNull()
  })

  it('F. returns null on -Infinity dividendYield', () => {
    expect(lynchFairValue({ eps: 5, earningsGrowthRate: 0.10, dividendYield: -Infinity })).toBeNull()
  })

  it('F. returns null on Infinity EPS', () => {
    expect(lynchFairValue({ eps: Infinity, earningsGrowthRate: 0.10, dividendYield: 0.02 })).toBeNull()
  })
})

describe('lynchFairValue — snapshot lock', () => {
  it('G. locks fair value for a fixed input triple', () => {
    // Sentinel triple chosen to exercise both growth + yield contributions
    // without engaging the cap. EPS=4.50, growth=10%, yield=3%
    //   fairPE = 13   →   fair value = 4.50 * 13 = 58.50
    const value = lynchFairValue({
      eps: 4.50,
      earningsGrowthRate: 0.10,
      dividendYield: 0.03,
    })
    expect(value).toMatchInlineSnapshot('58.5')
  })
})

describe('lynchFairValue — property tests', () => {
  it('H. positive inputs always yield a positive finite value bounded by 30 * EPS', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 0.30, noNaN: true }),
        fc.double({ min: 0, max: 0.10, noNaN: true }),
        (eps, growth, yld) => {
          const out = lynchFairValue({ eps, earningsGrowthRate: growth, dividendYield: yld })
          if (growth === 0 && yld === 0) {
            // Degenerate: fairPE = 0, function returns null.
            expect(out).toBeNull()
            return
          }
          expect(out).not.toBeNull()
          expect(Number.isFinite(out!)).toBe(true)
          // Result is non-negative (zero is possible when fairPE * EPS rounds
          // to 0 at 2dp, e.g., subnormal yields × tiny EPS).
          expect(out!).toBeGreaterThanOrEqual(0)
          // The cap is 30, so the value can never exceed 30 * EPS (modulo
          // rounding to 2dp, which can add at most 0.005).
          expect(out!).toBeLessThanOrEqual(eps * 30 + 0.005)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('I. mostly-negative-growth range either returns null or has a positive fairPE', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 50, noNaN: true }),
        fc.double({ min: -0.50, max: -0.01, noNaN: true }),
        fc.double({ min: 0, max: 0.005, noNaN: true }),
        (eps, growth, yld) => {
          const out = lynchFairValue({ eps, earningsGrowthRate: growth, dividendYield: yld })
          if (out === null) return // expected on most of this range
          // If a non-null value slips through (yield outweighed the small
          // negative growth), it must reflect a positive fairPE.
          const fairPE = growth * 100 + yld * 100
          expect(fairPE).toBeGreaterThan(0)
          expect(out).toBeGreaterThan(0)
        },
      ),
      { numRuns: 100 },
    )
  })
})
