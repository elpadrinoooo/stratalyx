/**
 * Per-investor valuation strategies.
 *
 * Each strategy takes a StrategyInput (FMP composite + market context) and
 * returns a ValuationOutput. The 22 investor IDs map to 9 strategy variants
 * — see STRATEGIES at the bottom.
 *
 * The pure math primitives (twoStageDCF, grahamNumber, ncavPerShare,
 * lynchFairValue) live in dcf.ts/graham.ts/lynch.ts. This module's job is
 * INPUT SHAPING — picking sensible defaults when FMP data is incomplete and
 * deciding what to do with the primitive's result.
 *
 * Strategies that genuinely don't produce a per-stock IV (Marks, Dalio)
 * return applicable=false with a reason. The UI displays "Qualitative
 * Analysis" instead of an IV range for those.
 */

import type { StrategyInput, ValuationOutput, DCFResult } from './types.js'
import { twoStageDCF } from './dcf.js'
import { grahamNumber, ncavPerShare } from './graham.js'
import { lynchFairValue } from './lynch.js'
import {
  clamp,
  defaultDiscountRate,
  ownerEarnings,
  netDebt,
  marginOfSafety,
  impliedGrowthRate,
  round,
} from './helpers.js'

// ── Shared helpers for strategy result construction ──────────────────────────

function inapplicable(method: string, reason: string, marketPrice: number, warnings: string[] = []): ValuationOutput {
  return {
    method,
    applicable: false,
    inapplicableReason: reason,
    intrinsicValueLow:  null,
    intrinsicValueMid:  null,
    intrinsicValueHigh: null,
    marginOfSafety:     null,
    marketPrice,
    inputsUsed:         {},
    sensitivity:        [],
    warnings,
  }
}

/** Convert a DCFResult into a ValuationOutput with method label + MoS. */
function dcfToOutput(
  method: string,
  dcf: DCFResult,
  marketPrice: number,
  extraInputs: Record<string, number | string | null>,
  extraWarnings: string[] = [],
): ValuationOutput {
  return {
    method,
    applicable: true,
    intrinsicValueLow:  dcf.low,
    intrinsicValueMid:  dcf.intrinsicValuePerShare,
    intrinsicValueHigh: dcf.high,
    marginOfSafety:     marginOfSafety(dcf.intrinsicValuePerShare, marketPrice),
    marketPrice,
    inputsUsed: {
      currentFCF:           dcf.inputsUsed.currentFCF,
      highGrowthRate:       dcf.inputsUsed.highGrowthRate,
      highGrowthYears:      dcf.inputsUsed.highGrowthYears,
      terminalGrowthRate:   dcf.inputsUsed.terminalGrowthRate,
      discountRate:         dcf.inputsUsed.discountRate,
      sharesOutstanding:    dcf.inputsUsed.sharesOutstanding,
      netDebt:              dcf.inputsUsed.netDebt,
      ...extraInputs,
    },
    sensitivity: dcf.sensitivityTable,
    warnings: [...dcf.warnings, ...extraWarnings],
  }
}

/**
 * Resolve a high-growth rate from input. Priority:
 *   1. caller-supplied earningsGrowthRate
 *   2. CAGR derived from incomeHistory
 *   3. fallback to 0.08 (8%, a long-run S&P-ish default for "no information")
 * Returns the chosen rate plus a warning when the fallback is used.
 */
function resolveGrowthRate(input: StrategyInput, max: number = 0.20): { rate: number; warning?: string } {
  if (typeof input.earningsGrowthRate === 'number' && Number.isFinite(input.earningsGrowthRate)) {
    return { rate: clamp(input.earningsGrowthRate, -0.20, max) }
  }
  const implied = impliedGrowthRate(input.incomeHistory)
  if (implied !== null) {
    return { rate: clamp(implied, -0.20, max) }
  }
  return {
    rate: 0.08,
    warning: 'Growth rate defaulted to 8% (no caller value, no usable income history)',
  }
}

// ── Strategy 1: ownerEarningsTwoStageDCF (Buffett, Munger, Pabrai, Smith, Li Lu, Ackman) ──

export function ownerEarningsTwoStageDCF(input: StrategyInput): ValuationOutput {
  const method = 'Two-stage DCF on owner earnings (FCF)'
  const oe = ownerEarnings(input)
  if (oe === null) {
    return inapplicable(method, 'No positive free cash flow available — owner-earnings DCF requires positive FCF.', input.marketPrice)
  }
  const shares = input.sharesOutstanding
  if (typeof shares !== 'number' || shares <= 0) {
    return inapplicable(method, 'Shares outstanding missing.', input.marketPrice)
  }

  const { rate: growthRate, warning: growthWarning } = resolveGrowthRate(input)
  const dr = defaultDiscountRate(input.marketCapUSD)
  const dcf = twoStageDCF({
    currentFCF: oe,
    highGrowthRate: growthRate,
    highGrowthYears: 5,
    terminalGrowthRate: 0.025,
    discountRate: dr,
    sharesOutstanding: shares,
    netDebt: netDebt(input),
  })
  if (!dcf) {
    return inapplicable(method, 'DCF produced a degenerate result (likely discount rate ≤ terminal growth).', input.marketPrice)
  }
  return dcfToOutput(method, dcf, input.marketPrice, { ownerEarningsSource: 'FCF (FMP cash-flow-statement)' }, growthWarning ? [growthWarning] : [])
}

// ── Strategy 2: grahamWithNCAV (Graham, Schloss) ─────────────────────────────

export function grahamWithNCAV(input: StrategyInput): ValuationOutput {
  const method = 'Graham number with NCAV floor'
  const eps = input.ratios?.eps ?? input.income?.eps
  const bvps = input.ratios?.bookValuePerShare
  const graham = (typeof eps === 'number' && typeof bvps === 'number')
    ? grahamNumber({ eps, bookValuePerShare: bvps })
    : null

  const ncav = (
    typeof input.balanceSheet?.currentAssets === 'number' &&
    typeof input.balanceSheet?.totalLiabilities === 'number' &&
    typeof input.sharesOutstanding === 'number'
  )
    ? ncavPerShare({
        currentAssets: input.balanceSheet.currentAssets,
        totalLiabilities: input.balanceSheet.totalLiabilities,
        sharesOutstanding: input.sharesOutstanding,
      })
    : null

  if (graham === null && ncav === null) {
    return inapplicable(method, 'Neither Graham number (needs EPS+BVPS) nor NCAV (needs balance sheet) is computable.', input.marketPrice)
  }
  // Floor = NCAV (deep-value liquidation), ceiling = grahamNumber (defensive value)
  const low  = ncav   !== null ? ncav   : graham
  const mid  = graham !== null ? graham : ncav
  const high = graham !== null ? round(graham * 1.5, 2) : ncav  // Graham's "speculative" 1.5x ceiling
  return {
    method,
    applicable: true,
    intrinsicValueLow:  low,
    intrinsicValueMid:  mid,
    intrinsicValueHigh: high,
    marginOfSafety:     marginOfSafety(mid, input.marketPrice),
    marketPrice:        input.marketPrice,
    inputsUsed: {
      eps:            eps  ?? null,
      bookValuePerShare: bvps ?? null,
      grahamNumber:   graham,
      ncavPerShare:   ncav,
    },
    sensitivity: [],
    warnings: ncav === null ? ['NCAV unavailable (no balance-sheet data) — using Graham number alone.'] : [],
  }
}

// ── Strategy 3: pegBasedFairValue (Lynch, Fisher, Miller) ────────────────────

export function pegBasedFairValue(input: StrategyInput): ValuationOutput {
  const method = "Lynch PEG-based fair value (cap P/E ≤ 30)"
  const eps = input.ratios?.eps ?? input.income?.eps
  if (typeof eps !== 'number' || eps <= 0) {
    return inapplicable(method, 'Trailing EPS missing or non-positive.', input.marketPrice)
  }
  const { rate: growth, warning: growthWarning } = resolveGrowthRate(input, 0.30)  // PEG strategies tolerate higher growth
  const yld = input.ratios?.dividendYield ?? 0
  const fair = lynchFairValue({ eps, earningsGrowthRate: growth, dividendYield: yld })
  if (fair === null) {
    return inapplicable(method, 'Lynch fair-value formula returned null (likely negative growth swamps yield).', input.marketPrice, growthWarning ? [growthWarning] : [])
  }
  // Range = ±20% around fair value to capture growth-rate uncertainty
  const low  = round(fair * 0.80, 2)
  const high = round(fair * 1.20, 2)
  return {
    method,
    applicable: true,
    intrinsicValueLow:  low,
    intrinsicValueMid:  fair,
    intrinsicValueHigh: high,
    marginOfSafety:     marginOfSafety(fair, input.marketPrice),
    marketPrice:        input.marketPrice,
    inputsUsed: {
      eps,
      earningsGrowthRate: growth,
      dividendYield: yld,
    },
    sensitivity: [],
    warnings: growthWarning ? [growthWarning] : [],
  }
}

// ── Strategy 4: assetFloorPlusDCF (Klarman, Watsa, Burry, Einhorn) ───────────

export function assetFloorPlusDCF(input: StrategyInput): ValuationOutput {
  const method = 'Asset floor (NCAV) + owner-earnings DCF upside'
  const ncav = (
    typeof input.balanceSheet?.currentAssets === 'number' &&
    typeof input.balanceSheet?.totalLiabilities === 'number' &&
    typeof input.sharesOutstanding === 'number'
  )
    ? ncavPerShare({
        currentAssets: input.balanceSheet.currentAssets,
        totalLiabilities: input.balanceSheet.totalLiabilities,
        sharesOutstanding: input.sharesOutstanding,
      })
    : null

  const dcfOutput = ownerEarningsTwoStageDCF(input)
  if (!dcfOutput.applicable && ncav === null) {
    return inapplicable(method, 'Neither NCAV nor DCF is computable — no asset floor and no positive FCF.', input.marketPrice)
  }
  const dcfMid = dcfOutput.intrinsicValueMid
  const low  = ncav   !== null ? ncav   : dcfOutput.intrinsicValueLow
  const mid  = dcfMid !== null ? dcfMid : ncav
  const high = dcfOutput.intrinsicValueHigh ?? (dcfMid !== null ? round(dcfMid * 1.30, 2) : ncav)
  return {
    method,
    applicable: true,
    intrinsicValueLow:  low,
    intrinsicValueMid:  mid,
    intrinsicValueHigh: high,
    marginOfSafety:     marginOfSafety(mid, input.marketPrice),
    marketPrice:        input.marketPrice,
    inputsUsed: {
      ...dcfOutput.inputsUsed,
      ncavPerShareFloor: ncav,
    },
    sensitivity: dcfOutput.sensitivity,
    warnings: [
      ...dcfOutput.warnings,
      ...(ncav === null ? ['NCAV floor unavailable (no balance-sheet data) — DCF only.'] : []),
    ],
  }
}

// ── Strategy 5: aggressiveGrowthDCF (Cathie Wood) ────────────────────────────

export function aggressiveGrowthDCF(input: StrategyInput): ValuationOutput {
  const method = 'Aggressive-growth DCF (high-growth phase capped at 20%)'
  const oe = ownerEarnings(input)
  if (oe === null) {
    return inapplicable(method, 'No positive free cash flow — aggressive-growth DCF requires positive FCF.', input.marketPrice)
  }
  if (typeof input.sharesOutstanding !== 'number' || input.sharesOutstanding <= 0) {
    return inapplicable(method, 'Shares outstanding missing.', input.marketPrice)
  }
  // Use the maximum allowed growth rate (the primitive's clamp at 0.20).
  // Wood's framework anchors on the upside of disruption-driven growth.
  const { rate: rawGrowth, warning: growthWarning } = resolveGrowthRate(input, 0.30)
  const growth = clamp(Math.max(rawGrowth, 0.15), -0.20, 0.20)  // floor at 15% — Wood doesn't pick low-growth names
  const dr = defaultDiscountRate(input.marketCapUSD)
  const dcf = twoStageDCF({
    currentFCF: oe,
    highGrowthRate: growth,
    highGrowthYears: 7,                       // longer disruption runway
    terminalGrowthRate: 0.025,
    discountRate: dr,
    sharesOutstanding: input.sharesOutstanding,
    netDebt: netDebt(input),
  })
  if (!dcf) {
    return inapplicable(method, 'DCF produced a degenerate result.', input.marketPrice)
  }
  return dcfToOutput(method, dcf, input.marketPrice, { growthFloor: 0.15, runwayYears: 7 }, growthWarning ? [growthWarning] : [])
}

// ── Strategy 6: macroAdjustedDCF (Druckenmiller, Soros) ──────────────────────

export function macroAdjustedDCF(input: StrategyInput): ValuationOutput {
  // We don't have macro indicators wired (no rates curve, no dollar index). So
  // for now this is the same DCF as Buffett-style, but the method label tells
  // the user the macro layer applies in the LLM narrative, not the math.
  const base = ownerEarningsTwoStageDCF(input)
  return {
    ...base,
    method: 'Two-stage DCF (macro overlay applied qualitatively in narrative)',
    warnings: [...base.warnings, 'Macro adjustments are reflected in the narrative, not the deterministic numbers.'],
  }
}

// ── Strategy 7: magicFormulaScreen (Greenblatt) ──────────────────────────────

export function magicFormulaScreen(input: StrategyInput): ValuationOutput {
  // The Magic Formula is a ranking screen across many stocks, not a per-stock
  // intrinsic value. We approximate Greenblatt's approach by pinning fair
  // value at the price that would yield a 10% earnings yield (Greenblatt's
  // implicit floor for "cheap"). Below that price → "screen pass".
  const method = 'Greenblatt earnings-yield target (10% EY)'
  const eps = input.ratios?.eps ?? input.income?.eps
  if (typeof eps !== 'number' || eps <= 0) {
    return inapplicable(method, 'Magic Formula screen needs positive trailing EPS.', input.marketPrice)
  }
  const fair = round(eps / 0.10, 2)  // price s.t. EPS/price = 10%
  return {
    method,
    applicable: true,
    intrinsicValueLow:  round(fair * 0.85, 2),
    intrinsicValueMid:  fair,
    intrinsicValueHigh: round(fair * 1.15, 2),
    marginOfSafety:     marginOfSafety(fair, input.marketPrice),
    marketPrice:        input.marketPrice,
    inputsUsed: { eps, targetEarningsYield: 0.10 },
    sensitivity: [],
    warnings: ['Greenblatt is a ranking screen across the universe; this is a single-stock approximation.'],
  }
}

// ── Strategy 8: deepValueScreen (Templeton) ──────────────────────────────────

export function deepValueScreen(input: StrategyInput): ValuationOutput {
  // Templeton wanted to buy at "the point of maximum pessimism" — typically
  // < 50% of intrinsic value. We use NCAV as the deep-value floor and book
  // value as the upside reference; if neither is available, fall back to
  // 50%-of-Graham as a conservative target.
  const method = 'Templeton deep-value (NCAV floor; 50% of Graham as buy target)'
  const eps = input.ratios?.eps ?? input.income?.eps
  const bvps = input.ratios?.bookValuePerShare
  const graham = (typeof eps === 'number' && typeof bvps === 'number')
    ? grahamNumber({ eps, bookValuePerShare: bvps })
    : null
  const ncav = (
    typeof input.balanceSheet?.currentAssets === 'number' &&
    typeof input.balanceSheet?.totalLiabilities === 'number' &&
    typeof input.sharesOutstanding === 'number'
  )
    ? ncavPerShare({
        currentAssets: input.balanceSheet.currentAssets,
        totalLiabilities: input.balanceSheet.totalLiabilities,
        sharesOutstanding: input.sharesOutstanding,
      })
    : null

  if (graham === null && ncav === null) {
    return inapplicable(method, 'Templeton screen needs at least Graham (EPS+BVPS) or NCAV (balance sheet).', input.marketPrice)
  }
  // Buy target = 50% of Graham (deep-value entry); upside = Graham; floor = NCAV.
  const buyTarget = graham !== null ? round(graham * 0.5, 2) : ncav
  const upside    = graham !== null ? graham : ncav
  return {
    method,
    applicable: true,
    intrinsicValueLow:  ncav !== null ? ncav : buyTarget,
    intrinsicValueMid:  buyTarget,
    intrinsicValueHigh: upside,
    marginOfSafety:     marginOfSafety(buyTarget, input.marketPrice),
    marketPrice:        input.marketPrice,
    inputsUsed: { eps: eps ?? null, bookValuePerShare: bvps ?? null, grahamNumber: graham, ncavPerShare: ncav, buyAtFractionOfGraham: 0.5 },
    sensitivity: [],
    warnings: [],
  }
}

// ── Strategy 9: noPerStockValuation (Marks, Dalio) ───────────────────────────

export function noPerStockValuation(input: StrategyInput): ValuationOutput {
  return inapplicable(
    'Qualitative (no per-stock IV)',
    "Marks and Dalio frameworks emphasize macro positioning, cycle awareness, and risk parity — not per-stock intrinsic value. The narrative carries the analysis.",
    input.marketPrice,
  )
}

// ── Investor → strategy mapping ──────────────────────────────────────────────

export type ValuationStrategy = (input: StrategyInput) => ValuationOutput

/**
 * Maps every supported investor ID to its valuation strategy. Add new
 * investors here when they're added to src/constants/investors.ts; the
 * strategies test verifies every INV id has a strategy (no silent gaps).
 */
export const STRATEGIES: Record<string, ValuationStrategy> = {
  buffett:       ownerEarningsTwoStageDCF,
  munger:        ownerEarningsTwoStageDCF,
  pabrai:        ownerEarningsTwoStageDCF,
  smith:         ownerEarningsTwoStageDCF,
  lilu:          ownerEarningsTwoStageDCF,
  ackman:        ownerEarningsTwoStageDCF,
  graham:        grahamWithNCAV,
  schloss:       grahamWithNCAV,
  lynch:         pegBasedFairValue,
  fisher:        pegBasedFairValue,
  miller:        pegBasedFairValue,
  klarman:       assetFloorPlusDCF,
  watsa:         assetFloorPlusDCF,
  burry:         assetFloorPlusDCF,
  einhorn:       assetFloorPlusDCF,
  wood:          aggressiveGrowthDCF,
  druckenmiller: macroAdjustedDCF,
  soros:         macroAdjustedDCF,
  marks:         noPerStockValuation,
  dalio:         noPerStockValuation,
  greenblatt:    magicFormulaScreen,
  templeton:     deepValueScreen,
}

/** Look up the strategy for an investor; falls back to ownerEarningsTwoStageDCF. */
export function valuationFor(investorId: string, input: StrategyInput): ValuationOutput {
  const strategy = STRATEGIES[investorId] ?? ownerEarningsTwoStageDCF
  return strategy(input)
}
