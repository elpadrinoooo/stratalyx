/**
 * Types for the deterministic valuation engine.
 *
 * The engine lives entirely server-side (Phase 4). Strategies consume a
 * StrategyInput (FMP composite + market context) and produce a
 * ValuationOutput that the analysis pipeline merges with the LLM's
 * qualitative narrative before persisting + returning to the client.
 *
 * NOTHING in this module is allowed to call out to a network. Pure math,
 * deterministic given the inputs. Tests rely on this.
 */

/** A single cell in the 3x3 sensitivity grid. */
export interface SensitivityCell {
  discountRate: number
  terminalGrowth: number
  intrinsicValue: number
}

/** Pure two-stage DCF inputs — the math, not a strategy wrapper. */
export interface DCFInputs {
  /** Most recent free cash flow (or owner earnings), in absolute dollars. */
  currentFCF: number
  /** Growth rate during high-growth phase, decimal (0.12 = 12%). Clamped to [-0.20, 0.20]. */
  highGrowthRate: number
  /** Years of high growth before terminal. Defaults to 5. Clamped to [1, 15]. */
  highGrowthYears?: number
  /** Perpetual growth rate after high-growth phase, decimal. Clamped to [0.02, 0.03]. */
  terminalGrowthRate: number
  /** Discount rate (WACC proxy), decimal. Must be > terminalGrowthRate. */
  discountRate: number
  /** Diluted share count. Must be > 0. */
  sharesOutstanding: number
  /** Total debt minus cash & equivalents. */
  netDebt: number
}

/** Output of the pure twoStageDCF function. */
export interface DCFResult {
  /** Center estimate, per share. */
  intrinsicValuePerShare: number
  /** Low end of the sensitivity range (worst-case discount + terminal). */
  low: number
  /** High end of the sensitivity range (best-case discount + terminal). */
  high: number
  /** 3x3 sensitivity grid. */
  sensitivityTable: SensitivityCell[]
  /** Echoes the inputs actually used (post-clamp), so the UI can show them. */
  inputsUsed: Required<DCFInputs>
  /** Soft warnings (clamps, missing data, etc.). */
  warnings: string[]
}

/** What every per-investor strategy receives. Optional fields are real-world reality. */
export interface StrategyInput {
  ticker: string
  /** Current market price per share, used for margin-of-safety. */
  marketPrice: number
  /** Total market cap in USD (used to pick discountRate defaults). */
  marketCapUSD: number
  /** Industry classification — strategies can use this for sector-specific tweaks. */
  sector?: string

  /** Trailing 12-month ratios (FMP's ratios-ttm endpoint). */
  ratios?: {
    eps?: number
    bookValuePerShare?: number
    dividendYield?: number  // decimal, e.g., 0.022
    pe?: number
    peg?: number
    roe?: number            // decimal
  }

  /** Most recent annual income statement. */
  income?: {
    revenue?: number
    netIncome?: number
    eps?: number
  }

  /**
   * Multi-year annual income statements, NEWEST FIRST (FMP convention).
   * Used by strategies that derive earnings-growth rate from history rather
   * than relying on caller-supplied earningsGrowthRate. Optional — when
   * absent, strategies fall back to default growth assumptions.
   */
  incomeHistory?: { date: string; netIncome: number; eps?: number; revenue?: number }[]

  /** Most recent annual cash flow. */
  cashFlow?: {
    freeCashFlow?: number
    operatingCashFlow?: number
    capitalExpenditure?: number
  }

  /**
   * Most recent balance sheet items. FMP doesn't return these via the current
   * proxied endpoints — strategies that need them (NCAV, asset-floor) gracefully
   * return inapplicable when missing. Phase 3.2's FMP service expansion will
   * populate these.
   */
  balanceSheet?: {
    currentAssets?: number
    totalLiabilities?: number
    totalDebt?: number
    cashAndEquivalents?: number
  }

  sharesOutstanding?: number
  /** Forward earnings growth rate, decimal — used by PEG-style strategies. */
  earningsGrowthRate?: number
}

/**
 * The output every strategy returns. Merged with LLM narrative before
 * persisting. Contains everything the share-page UI needs to display the
 * deterministic side of the analysis.
 */
export interface ValuationOutput {
  /** Method label for display, e.g. "Two-stage DCF on owner earnings". */
  method: string

  /**
   * False when this framework doesn't produce a per-stock valuation
   * (Marks, Dalio). UI shows a "Qualitative Analysis" badge instead of
   * an IV range.
   */
  applicable: boolean
  /** Required when !applicable, optional otherwise. */
  inapplicableReason?: string

  /** Low end of the intrinsic-value range, per share. Null when !applicable or math degenerate. */
  intrinsicValueLow: number | null
  /** Center estimate. */
  intrinsicValueMid: number | null
  /** High end of the range. */
  intrinsicValueHigh: number | null

  /** Margin of safety vs marketPrice, as a decimal. Positive = undervalued. Null when !applicable. */
  marginOfSafety: number | null

  /** Echoed back so the UI can show the user what drove the number. */
  marketPrice: number

  /**
   * Inputs that drove the calc, plain-English keys for the "Inputs used"
   * UI panel. Numbers stay numeric so the UI can format them; strings only
   * when the value is genuinely non-numeric ("annual", "TTM", etc.).
   */
  inputsUsed: Record<string, number | string | null>

  /** 3x3 sensitivity grid. Empty for non-DCF strategies. */
  sensitivity: SensitivityCell[]

  /**
   * Soft warnings the UI can show as caveats. Examples:
   *   "FCF clamped to current value (negative inputs not supported)"
   *   "Discount rate defaulted to 11% (no WACC provided)"
   *   "Earnings growth rate clamped to 20% (input was 35%)"
   */
  warnings: string[]
}
