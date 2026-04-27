/**
 * @jest-environment node
 *
 * Unit tests for the two Graham primitives in ../graham.ts.
 *
 * Coverage:
 *   A–G  grahamNumber: happy paths, EPS/BVPS guards, snapshot, fast-check property
 *   H–L  ncavPerShare: net-net happy path, negative result is preserved,
 *        share-count guard, non-finite guard, fast-check property
 */

import { describe, it, expect } from '@jest/globals'
import fc from 'fast-check'

import { grahamNumber, ncavPerShare } from '../graham'

describe('grahamNumber', () => {
  // A — Briggs & Stratton-style small cap (Graham classic territory)
  it('A. computes ~35.18 for BRI-like inputs (EPS=2.5, BVPS=22)', () => {
    const v = grahamNumber({ eps: 2.5, bookValuePerShare: 22 })
    expect(v).not.toBeNull()
    // sqrt(22.5 * 2.5 * 22) = sqrt(1237.5) ≈ 35.1781…
    expect(v as number).toBeGreaterThan(35.16)
    expect(v as number).toBeLessThan(35.20)
    expect(Math.abs((v as number) - 35.18)).toBeLessThanOrEqual(0.02)
  })

  // B — Healthier earnings, lighter book (AAPL-like)
  it('B. computes ~23.24 for AAPL-like inputs (EPS=6, BVPS=4)', () => {
    const v = grahamNumber({ eps: 6, bookValuePerShare: 4 })
    expect(v).not.toBeNull()
    // sqrt(22.5 * 6 * 4) = sqrt(540) ≈ 23.2379…
    expect(Math.abs((v as number) - 23.24)).toBeLessThanOrEqual(0.02)
  })

  // C — EPS guard: Graham's screen requires positive earnings
  it.each([
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
  ])('C. returns null when EPS is %s', (_label, eps) => {
    expect(grahamNumber({ eps, bookValuePerShare: 10 })).toBeNull()
  })

  // D — BVPS guard: negative equity disqualifies
  it.each([
    ['zero', 0],
    ['negative', -5],
    ['NaN', Number.NaN],
  ])('D. returns null when BVPS is %s', (_label, bvps) => {
    expect(grahamNumber({ eps: 2, bookValuePerShare: bvps })).toBeNull()
  })

  // E — Sanity: both negative
  it('E. returns null when both EPS and BVPS are negative', () => {
    expect(grahamNumber({ eps: -1, bookValuePerShare: -1 })).toBeNull()
  })

  // F — Snapshot test locks the formula. Any accidental constant tweak
  // (e.g. 22.5 → 25) or rounding change will break this.
  it('F. snapshot: locks the formula for a fixed input pair', () => {
    expect(grahamNumber({ eps: 4, bookValuePerShare: 16 })).toMatchInlineSnapshot(`37.95`)
  })

  // G — Property: for any plausible positive EPS/BVPS, the output is
  // a positive finite number that matches sqrt(22.5*EPS*BVPS) within rounding.
  it('G. property: matches sqrt(22.5*EPS*BVPS) within rounding tolerance (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true }),
        (eps, bvps) => {
          const v = grahamNumber({ eps, bookValuePerShare: bvps })
          expect(v).not.toBeNull()
          const n = v as number
          expect(Number.isFinite(n)).toBe(true)
          expect(n).toBeGreaterThan(0)
          const exact = Math.sqrt(22.5 * eps * bvps)
          // Tolerate one-cent rounding (round to 2 dp ⇒ ≤ 0.005 in absolute terms).
          expect(Math.abs(n - exact)).toBeLessThanOrEqual(0.01)
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('ncavPerShare', () => {
  // H — Classic net-net example
  it('H. computes 4.00 per share for a healthy net-net', () => {
    const v = ncavPerShare({
      currentAssets: 10_000_000,
      totalLiabilities: 6_000_000,
      sharesOutstanding: 1_000_000,
    })
    expect(v).toBe(4)
  })

  // I — Negative NCAV is meaningful and must be returned (NOT nulled)
  it('I. returns -3.00 (not null) when liabilities exceed current assets', () => {
    const v = ncavPerShare({
      currentAssets: 5_000_000,
      totalLiabilities: 8_000_000,
      sharesOutstanding: 1_000_000,
    })
    expect(v).toBe(-3)
  })

  // J — Share-count guard
  it.each([
    ['zero', 0],
    ['negative', -100],
  ])('J. returns null when sharesOutstanding is %s', (_label, shares) => {
    expect(
      ncavPerShare({
        currentAssets: 10_000_000,
        totalLiabilities: 6_000_000,
        sharesOutstanding: shares,
      }),
    ).toBeNull()
  })

  // K — Non-finite guard for any input
  it.each([
    ['currentAssets', { currentAssets: Number.NaN, totalLiabilities: 1, sharesOutstanding: 1 }],
    ['totalLiabilities', { currentAssets: 1, totalLiabilities: Number.NaN, sharesOutstanding: 1 }],
    ['sharesOutstanding', { currentAssets: 1, totalLiabilities: 1, sharesOutstanding: Number.NaN }],
    ['Infinity in currentAssets', {
      currentAssets: Number.POSITIVE_INFINITY,
      totalLiabilities: 1,
      sharesOutstanding: 1,
    }],
  ])('K. returns null when %s is non-finite', (_label, inputs) => {
    expect(ncavPerShare(inputs)).toBeNull()
  })

  // L — Property: for plausible positive inputs, ncavPerShare always
  // returns a finite number (positive, zero, or negative are all valid).
  it('L. property: returns a finite number for plausible inputs (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1e12, noNaN: true }),
        fc.double({ min: 0, max: 1e12, noNaN: true }),
        fc.double({ min: 1, max: 1e10, noNaN: true }),
        (currentAssets, totalLiabilities, sharesOutstanding) => {
          const v = ncavPerShare({ currentAssets, totalLiabilities, sharesOutstanding })
          expect(v).not.toBeNull()
          expect(Number.isFinite(v as number)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})
