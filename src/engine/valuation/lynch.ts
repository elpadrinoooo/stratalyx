/**
 * Peter Lynch's PEG-based fair value primitive.
 *
 * Lynch's heuristic ("One Up On Wall Street"): a stock's fair P/E equals the
 * sum of its earnings growth rate (in percentage points) and its dividend
 * yield (in percentage points). Anything north of 30 is "too rich" and gets
 * capped — the framework was built for steady compounders, not hyper-growth.
 *
 * Pure math, deterministic. Returns null on degenerate inputs (non-positive
 * EPS, non-positive fair P/E, non-finite anything) rather than throwing — the
 * caller is the strategy wrapper, which converts null into an "inapplicable"
 * ValuationOutput.
 */

import { clamp, round } from './helpers.js'

/** Lynch's "anything above 30 is too rich" cap on fair P/E. */
const MAX_FAIR_PE = 30

export function lynchFairValue(inputs: {
  eps: number
  earningsGrowthRate: number    // decimal, e.g., 0.15 = 15%
  dividendYield: number         // decimal, e.g., 0.02 = 2%
}): number | null {
  const { eps, earningsGrowthRate, dividendYield } = inputs

  // Reject any non-finite input (NaN, Infinity, -Infinity).
  if (!Number.isFinite(eps)) return null
  if (!Number.isFinite(earningsGrowthRate)) return null
  if (!Number.isFinite(dividendYield)) return null

  // Lynch's framework needs trailing earnings.
  if (eps <= 0) return null

  // Fair P/E = growth percentage points + dividend yield percentage points.
  const rawFairPE = earningsGrowthRate * 100 + dividendYield * 100

  // Negative growth swamping yield → no meaningful Lynch fair value.
  if (rawFairPE <= 0) return null

  // Cap at 30 (Lynch's "too rich" rule). clamp's lower bound is 0 here so
  // we don't accidentally re-introduce negatives — but rawFairPE is already
  // > 0 by the guard above, so the lower bound is a belt-and-braces.
  const fairPE = clamp(rawFairPE, 0, MAX_FAIR_PE)

  return round(fairPE * eps, 2)
}
