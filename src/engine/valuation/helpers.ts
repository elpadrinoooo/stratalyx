/**
 * Pure helpers shared by the valuation primitives. Nothing here is allowed
 * to throw on real-world inputs (NaN, negative, Infinity); functions return
 * sentinels (null, 0) that callers handle deterministically.
 */

import type { StrategyInput } from './types.js'

/** Clamp value into [min, max]. NaN returns min. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/** Round to N decimal places (default 2). Returns 0 for non-finite. */
export function round(value: number, places = 2): number {
  if (!Number.isFinite(value)) return 0
  const f = 10 ** places
  return Math.round(value * f) / f
}

/**
 * Default discount rate by market cap. The plan's three buckets:
 *   large cap (>$10B) → 9%
 *   mid cap            → 11%
 *   small cap          → 13%
 */
export function defaultDiscountRate(marketCapUSD: number): number {
  if (!Number.isFinite(marketCapUSD) || marketCapUSD <= 0) return 0.11
  if (marketCapUSD >= 10_000_000_000) return 0.09
  if (marketCapUSD >= 2_000_000_000)  return 0.11
  return 0.13
}

/**
 * Owner Earnings — Buffett's preferred earnings metric. The classical
 * definition is Net Income + D&A - maintenance CapEx - working-capital
 * changes. We don't get maintenance-vs-growth capex breakdown from FMP, so
 * we use FCF as the canonical approximation (matches Buffett's later
 * pragmatic usage). Returns null when FCF is missing or non-positive.
 */
export function ownerEarnings(input: StrategyInput): number | null {
  const fcf = input.cashFlow?.freeCashFlow
  if (typeof fcf !== 'number' || !Number.isFinite(fcf) || fcf <= 0) return null
  return fcf
}

/** Net debt = total debt - cash. Returns 0 when balance sheet is missing. */
export function netDebt(input: StrategyInput): number {
  const debt = input.balanceSheet?.totalDebt ?? 0
  const cash = input.balanceSheet?.cashAndEquivalents ?? 0
  return Math.max(0, debt - cash)
}

/**
 * Build a 3x3 sensitivity grid varying discountRate by ±2pp and
 * terminalGrowth by ±0.5pp around the base point. Caller supplies the
 * function that turns (dr, tg) → intrinsic value per share.
 */
export function buildSensitivityGrid(
  baseDiscountRate: number,
  baseTerminalGrowth: number,
  compute: (discountRate: number, terminalGrowth: number) => number,
): { discountRate: number; terminalGrowth: number; intrinsicValue: number }[] {
  const drs = [baseDiscountRate - 0.02, baseDiscountRate, baseDiscountRate + 0.02]
  const tgs = [baseTerminalGrowth - 0.005, baseTerminalGrowth, baseTerminalGrowth + 0.005]
  const cells: { discountRate: number; terminalGrowth: number; intrinsicValue: number }[] = []
  for (const dr of drs) {
    for (const tg of tgs) {
      // Skip degenerate cells (discount rate must exceed terminal growth)
      if (dr <= tg) continue
      cells.push({
        discountRate: round(dr, 4),
        terminalGrowth: round(tg, 4),
        intrinsicValue: round(compute(dr, tg), 2),
      })
    }
  }
  return cells
}

/**
 * Margin of safety vs market price, as a decimal.
 *   positive → IV > price → undervalued
 *   negative → IV < price → overvalued
 * Returns null when either input is missing or non-positive.
 */
export function marginOfSafety(intrinsicValue: number | null, marketPrice: number): number | null {
  if (intrinsicValue === null || !Number.isFinite(intrinsicValue) || intrinsicValue <= 0) return null
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) return null
  return round((intrinsicValue - marketPrice) / marketPrice, 4)
}

/**
 * CAGR of net income across the income history, oldest to newest.
 * Returns null if fewer than 2 data points, or if any value is non-positive
 * (CAGR through a loss year is mathematically undefined). The list is
 * expected newest-first (the FMP convention) — the function flips internally.
 *
 * Result is clamped to the same DCF-friendly band [-0.20, 0.20] so callers
 * can use it directly as a high-growth rate without re-clamping.
 */
export function impliedGrowthRate(
  incomeHistory: { netIncome?: number }[] | undefined,
): number | null {
  if (!incomeHistory || incomeHistory.length < 2) return null
  // FMP returns newest-first; oldest is the last element.
  const oldest = incomeHistory[incomeHistory.length - 1]?.netIncome
  const newest = incomeHistory[0]?.netIncome
  if (typeof oldest !== 'number' || typeof newest !== 'number') return null
  if (!Number.isFinite(oldest) || !Number.isFinite(newest)) return null
  if (oldest <= 0 || newest <= 0) return null
  const years = incomeHistory.length - 1
  const cagr = (newest / oldest) ** (1 / years) - 1
  if (!Number.isFinite(cagr)) return null
  return clamp(cagr, -0.20, 0.20)
}
