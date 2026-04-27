/**
 * Pure two-stage discounted cash flow.
 *
 * Phase 4 — deterministic valuation engine. No I/O, no randomness; every
 * call with the same inputs returns the same result. Strategies wrap this
 * with input shaping; the math here is the contract.
 *
 * Algorithm (high-growth phase + Gordon terminal value):
 *   1. Validate / clamp inputs, collecting human-readable warnings.
 *   2. Project FCF for N years at the high-growth rate, discount each year.
 *   3. Compute terminal value at end of year N using Gordon growth, discount it.
 *   4. EV = sum of PVs; equity = EV - netDebt; per share = equity / shares.
 *   5. Build a 3x3 sensitivity grid by re-running step 2-4 at perturbed
 *      (discountRate, terminalGrowth) combinations.
 */

import type { DCFInputs, DCFResult, SensitivityCell } from './types.js'
import { clamp, round, buildSensitivityGrid } from './helpers.js'

const HIGH_GROWTH_MIN = -0.20
const HIGH_GROWTH_MAX = 0.20
const HIGH_GROWTH_YEARS_MIN = 1
const HIGH_GROWTH_YEARS_MAX = 15
const HIGH_GROWTH_YEARS_DEFAULT = 5
const TERMINAL_GROWTH_MIN = 0.02
const TERMINAL_GROWTH_MAX = 0.03

export function twoStageDCF(inputs: DCFInputs): DCFResult | null {
  const { currentFCF, sharesOutstanding, netDebt, discountRate } = inputs

  // ── Step 1: hard-fail validation ─────────────────────────────────────────
  if (!Number.isFinite(currentFCF) || currentFCF <= 0) return null
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null
  if (!Number.isFinite(discountRate)) return null

  // ── Step 2: clamp soft inputs, collect warnings ──────────────────────────
  const warnings: string[] = []

  const rawHighGrowth = inputs.highGrowthRate
  const highGrowthRate = clamp(
    Number.isFinite(rawHighGrowth) ? rawHighGrowth : 0,
    HIGH_GROWTH_MIN,
    HIGH_GROWTH_MAX,
  )
  if (!Number.isFinite(rawHighGrowth) || rawHighGrowth !== highGrowthRate) {
    warnings.push(
      `High-growth rate clamped to ${(highGrowthRate * 100).toFixed(1)}% ` +
      `(input was ${Number.isFinite(rawHighGrowth) ? (rawHighGrowth * 100).toFixed(1) + '%' : 'invalid'}).`,
    )
  }

  const rawHighGrowthYears = inputs.highGrowthYears
  const resolvedYearsInput =
    rawHighGrowthYears === undefined || !Number.isFinite(rawHighGrowthYears)
      ? HIGH_GROWTH_YEARS_DEFAULT
      : rawHighGrowthYears
  const highGrowthYears = clamp(resolvedYearsInput, HIGH_GROWTH_YEARS_MIN, HIGH_GROWTH_YEARS_MAX)
  if (rawHighGrowthYears !== undefined && rawHighGrowthYears !== highGrowthYears) {
    warnings.push(
      `High-growth years clamped to ${highGrowthYears} (input was ${rawHighGrowthYears}).`,
    )
  }

  const rawTerminalGrowth = inputs.terminalGrowthRate
  const terminalGrowthRate = clamp(
    Number.isFinite(rawTerminalGrowth) ? rawTerminalGrowth : TERMINAL_GROWTH_MIN,
    TERMINAL_GROWTH_MIN,
    TERMINAL_GROWTH_MAX,
  )
  if (!Number.isFinite(rawTerminalGrowth) || rawTerminalGrowth !== terminalGrowthRate) {
    warnings.push(
      `Terminal growth rate clamped to ${(terminalGrowthRate * 100).toFixed(2)}% ` +
      `(input was ${Number.isFinite(rawTerminalGrowth) ? (rawTerminalGrowth * 100).toFixed(2) + '%' : 'invalid'}).`,
    )
  }

  // Post-clamp degeneracy: discount must exceed terminal growth.
  if (discountRate <= terminalGrowthRate) return null

  // ── Step 3: center estimate ──────────────────────────────────────────────
  const computeIVPerShare = (dr: number, tg: number): number => {
    let pvHighGrowth = 0
    for (let t = 1; t <= highGrowthYears; t++) {
      const fcfT = currentFCF * Math.pow(1 + highGrowthRate, t)
      pvHighGrowth += fcfT / Math.pow(1 + dr, t)
    }
    const fcfAtN = currentFCF * Math.pow(1 + highGrowthRate, highGrowthYears)
    const terminalValueAtN = (fcfAtN * (1 + tg)) / (dr - tg)
    const pvTerminal = terminalValueAtN / Math.pow(1 + dr, highGrowthYears)
    const enterpriseValue = pvHighGrowth + pvTerminal
    const equityValue = enterpriseValue - netDebt
    return equityValue / sharesOutstanding
  }

  const centerIV = computeIVPerShare(discountRate, terminalGrowthRate)

  // ── Step 4: sensitivity grid ─────────────────────────────────────────────
  const sensitivityTable: SensitivityCell[] = buildSensitivityGrid(
    discountRate,
    terminalGrowthRate,
    computeIVPerShare,
  )

  // ── Step 5: derive low/high from grid (fall back to center if empty) ─────
  let low = centerIV
  let high = centerIV
  if (sensitivityTable.length > 0) {
    low = sensitivityTable[0].intrinsicValue
    high = sensitivityTable[0].intrinsicValue
    for (const cell of sensitivityTable) {
      if (cell.intrinsicValue < low) low = cell.intrinsicValue
      if (cell.intrinsicValue > high) high = cell.intrinsicValue
    }
  }

  // ── Step 6: assemble result ──────────────────────────────────────────────
  return {
    intrinsicValuePerShare: round(centerIV, 2),
    low: round(low, 2),
    high: round(high, 2),
    sensitivityTable,
    inputsUsed: {
      currentFCF,
      highGrowthRate,
      highGrowthYears,
      terminalGrowthRate,
      discountRate,
      sharesOutstanding,
      netDebt,
    },
    warnings,
  }
}
