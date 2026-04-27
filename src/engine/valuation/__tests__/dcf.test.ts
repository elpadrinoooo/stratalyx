/**
 * @jest-environment node
 *
 * Tests for the pure two-stage DCF function.
 * Phase 4 — deterministic valuation engine.
 */
import { describe, it, expect } from '@jest/globals'
import fc from 'fast-check'

import { twoStageDCF } from '../dcf.js'
import type { DCFInputs } from '../types.js'

const AAPL_FIXTURE: DCFInputs = {
  currentFCF: 100_000_000_000,
  highGrowthRate: 0.08,
  terminalGrowthRate: 0.025,
  discountRate: 0.09,
  sharesOutstanding: 15_000_000_000,
  netDebt: 50_000_000_000,
}

const KO_1988_FIXTURE: DCFInputs = {
  currentFCF: 800_000_000,
  highGrowthRate: 0.15,
  terminalGrowthRate: 0.03,
  discountRate: 0.10,
  sharesOutstanding: 360_000_000,
  netDebt: 0,
}

describe('twoStageDCF', () => {
  // ── A. Happy path ───────────────────────────────────────────────────────
  describe('A. happy path (AAPL-shaped)', () => {
    it('produces a sensible per-share value with low ≤ mid ≤ high', () => {
      const result = twoStageDCF(AAPL_FIXTURE)
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.intrinsicValuePerShare).toBeGreaterThan(50)
      expect(result.intrinsicValuePerShare).toBeLessThan(500)
      expect(result.low).toBeLessThanOrEqual(result.intrinsicValuePerShare)
      expect(result.high).toBeGreaterThanOrEqual(result.intrinsicValuePerShare)
      expect(result.warnings).toEqual([])
    })
  })

  // ── B. Historical fixture: KO 1988 ──────────────────────────────────────
  describe('B. KO 1988 historical fixture', () => {
    it('matches snapshot (regression detector for the formula)', () => {
      const result = twoStageDCF(KO_1988_FIXTURE)
      expect(result).toMatchSnapshot()
    })
  })

  // ── C. Non-positive currentFCF → null ───────────────────────────────────
  describe('C. returns null for non-positive currentFCF', () => {
    it.each([0, -100, NaN])('returns null when currentFCF = %p', (badFCF) => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, currentFCF: badFCF })
      expect(result).toBeNull()
    })
  })

  // ── D. Non-positive shares → null ───────────────────────────────────────
  describe('D. returns null for non-positive sharesOutstanding', () => {
    it.each([0, -1])('returns null when sharesOutstanding = %p', (badShares) => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, sharesOutstanding: badShares })
      expect(result).toBeNull()
    })
  })

  // ── E. discountRate ≤ terminalGrowthRate after clamping → null ─────────
  describe('E. returns null when discountRate ≤ terminalGrowthRate (post-clamp)', () => {
    it('returns null for dr=0.025, tg=0.025', () => {
      const result = twoStageDCF({
        ...AAPL_FIXTURE,
        discountRate: 0.025,
        terminalGrowthRate: 0.025,
      })
      expect(result).toBeNull()
    })
  })

  // ── F. Clamps highGrowthRate ────────────────────────────────────────────
  describe('F. clamps highGrowthRate and emits warning', () => {
    it('clamps 0.50 → 0.20 and warns', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, highGrowthRate: 0.50 })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.highGrowthRate).toBe(0.20)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => /growth/i.test(w))).toBe(true)
    })
  })

  // ── G. Clamps terminalGrowthRate ────────────────────────────────────────
  describe('G. clamps terminalGrowthRate and emits warning', () => {
    it('clamps 0.10 → 0.03 and warns', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, terminalGrowthRate: 0.10 })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.terminalGrowthRate).toBe(0.03)
      expect(result.warnings.some((w) => /terminal/i.test(w))).toBe(true)
    })
  })

  // ── H. Clamps highGrowthYears ───────────────────────────────────────────
  describe('H. clamps highGrowthYears and emits warning', () => {
    it('clamps 50 → 15 and warns', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, highGrowthYears: 50 })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.highGrowthYears).toBe(15)
      expect(result.warnings.some((w) => /years/i.test(w))).toBe(true)
    })
  })

  // ── I. Negative IV when netDebt is huge — still returned ────────────────
  describe('I. returns negative IV (does not null out) when netDebt swamps equity', () => {
    it('returns a negative per-share value, not null', () => {
      const result = twoStageDCF({
        ...AAPL_FIXTURE,
        currentFCF: 1e9,
        netDebt: 1e15,
        sharesOutstanding: 1e9,
      })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.intrinsicValuePerShare).toBeLessThan(0)
    })
  })

  // ── J. Sensitivity grid bounds ──────────────────────────────────────────
  describe('J. sensitivity grid is well-formed (≤9 cells, low ≤ mid ≤ high)', () => {
    it('AAPL fixture: cells in [1,9], low ≤ IV ≤ high', () => {
      const result = twoStageDCF(AAPL_FIXTURE)
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.sensitivityTable.length).toBeGreaterThan(0)
      expect(result.sensitivityTable.length).toBeLessThanOrEqual(9)
      expect(result.low).toBeLessThanOrEqual(result.intrinsicValuePerShare)
      expect(result.high).toBeGreaterThanOrEqual(result.intrinsicValuePerShare)
      for (const cell of result.sensitivityTable) {
        expect(Number.isFinite(cell.intrinsicValue)).toBe(true)
        expect(cell.discountRate).toBeGreaterThan(cell.terminalGrowth)
      }
    })
  })

  // ── K. Property: any valid input → null OR finite IV ────────────────────
  describe('K. property — finite IV or null', () => {
    it('returns null or a result with a finite intrinsicValuePerShare', () => {
      fc.assert(
        fc.property(
          fc.record({
            currentFCF: fc.double({ min: 1e6, max: 1e12, noNaN: true, noDefaultInfinity: true }),
            highGrowthRate: fc.double({ min: -0.50, max: 0.50, noNaN: true, noDefaultInfinity: true }),
            highGrowthYears: fc.integer({ min: 1, max: 30 }),
            terminalGrowthRate: fc.double({ min: 0, max: 0.10, noNaN: true, noDefaultInfinity: true }),
            discountRate: fc.double({ min: 0.01, max: 0.30, noNaN: true, noDefaultInfinity: true }),
            sharesOutstanding: fc.double({ min: 1e6, max: 1e11, noNaN: true, noDefaultInfinity: true }),
            netDebt: fc.double({ min: -1e12, max: 1e12, noNaN: true, noDefaultInfinity: true }),
          }),
          (inputs) => {
            const result = twoStageDCF(inputs)
            if (result === null) return
            expect(Number.isFinite(result.intrinsicValuePerShare)).toBe(true)
            expect(Number.isFinite(result.low)).toBe(true)
            expect(Number.isFinite(result.high)).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // ── M. Defensive guards: NaN/non-finite inputs on each axis ─────────────
  describe('M. defensive guards', () => {
    it('returns null when discountRate is NaN', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, discountRate: NaN })
      expect(result).toBeNull()
    })
    it('returns null when discountRate is Infinity', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, discountRate: Infinity })
      expect(result).toBeNull()
    })
    it('treats NaN highGrowthRate as 0 and warns about invalid input', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, highGrowthRate: NaN })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.highGrowthRate).toBe(0)
      expect(result.warnings.some((w) => /invalid/i.test(w))).toBe(true)
    })
    it('treats NaN terminalGrowthRate as the floor and warns about invalid input', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, terminalGrowthRate: NaN })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.terminalGrowthRate).toBe(0.02)
      expect(result.warnings.some((w) => /terminal/i.test(w) && /invalid/i.test(w))).toBe(true)
    })
    it('handles non-finite highGrowthYears via the default fallback', () => {
      const result = twoStageDCF({ ...AAPL_FIXTURE, highGrowthYears: NaN })
      expect(result).not.toBeNull()
      if (!result) return
      expect(result.inputsUsed.highGrowthYears).toBe(5)  // the default
    })
  })

  // ── L. Property: low ≤ mid ≤ high always ────────────────────────────────
  describe('L. property — low ≤ intrinsicValuePerShare ≤ high', () => {
    it('always holds for non-null results', () => {
      fc.assert(
        fc.property(
          fc.record({
            currentFCF: fc.double({ min: 1e6, max: 1e12, noNaN: true, noDefaultInfinity: true }),
            highGrowthRate: fc.double({ min: -0.20, max: 0.20, noNaN: true, noDefaultInfinity: true }),
            highGrowthYears: fc.integer({ min: 1, max: 15 }),
            terminalGrowthRate: fc.double({ min: 0.02, max: 0.03, noNaN: true, noDefaultInfinity: true }),
            discountRate: fc.double({ min: 0.06, max: 0.20, noNaN: true, noDefaultInfinity: true }),
            sharesOutstanding: fc.double({ min: 1e6, max: 1e11, noNaN: true, noDefaultInfinity: true }),
            netDebt: fc.double({ min: 0, max: 1e11, noNaN: true, noDefaultInfinity: true }),
          }),
          (inputs) => {
            const result = twoStageDCF(inputs)
            if (result === null) return
            expect(result.low).toBeLessThanOrEqual(result.intrinsicValuePerShare)
            expect(result.high).toBeGreaterThanOrEqual(result.intrinsicValuePerShare)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
