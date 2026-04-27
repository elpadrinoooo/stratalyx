/**
 * Benjamin Graham's two foundational value-investing primitives.
 *
 *   grahamNumber(eps, bvps)
 *     The "maximum defensible price" from The Intelligent Investor —
 *     sqrt(22.5 * EPS * BVPS), where 22.5 = 15 (max P/E) * 1.5 (max P/B).
 *     Returns null when Graham's screen disqualifies the input (no earnings
 *     or negative book value).
 *
 *   ncavPerShare(currentAssets, totalLiabilities, sharesOutstanding)
 *     Net Current Asset Value — Graham's deep-value liquidation floor.
 *     A net-net trades below this number. Negative results are meaningful
 *     (liabilities exceed current assets — there's no liquidation cushion)
 *     and are returned as-is, not nulled out.
 *
 * Pure math. No I/O, no throws on real-world inputs (NaN, Infinity,
 * negatives all return either null or, for NCAV, a sentinel-free number).
 */

import { round } from './helpers.js'

export function grahamNumber(inputs: { eps: number; bookValuePerShare: number }): number | null {
  const { eps, bookValuePerShare: bvps } = inputs
  if (!Number.isFinite(eps) || !Number.isFinite(bvps)) return null
  if (eps <= 0 || bvps <= 0) return null
  return round(Math.sqrt(22.5 * eps * bvps), 2)
}

export function ncavPerShare(inputs: {
  currentAssets: number
  totalLiabilities: number
  sharesOutstanding: number
}): number | null {
  const { currentAssets, totalLiabilities, sharesOutstanding } = inputs
  if (
    !Number.isFinite(currentAssets) ||
    !Number.isFinite(totalLiabilities) ||
    !Number.isFinite(sharesOutstanding)
  ) {
    return null
  }
  if (sharesOutstanding <= 0) return null
  return round((currentAssets - totalLiabilities) / sharesOutstanding, 2)
}
