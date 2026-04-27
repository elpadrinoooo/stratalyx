/**
 * Public entry point for the deterministic valuation engine (Phase 4).
 *
 * Consumers (server analysis pipeline, future test fixtures) should import
 * from here, not reach into the per-file modules. Keeps the surface stable
 * if internal organization changes.
 */

export type {
  StrategyInput,
  ValuationOutput,
  DCFInputs,
  DCFResult,
  SensitivityCell,
} from './types.js'

export { twoStageDCF } from './dcf.js'
export { grahamNumber, ncavPerShare } from './graham.js'
export { lynchFairValue } from './lynch.js'

export {
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
  type ValuationStrategy,
} from './strategies.js'

export {
  clamp,
  round,
  defaultDiscountRate,
  ownerEarnings,
  netDebt,
  buildSensitivityGrid,
  marginOfSafety,
  impliedGrowthRate,
} from './helpers.js'
