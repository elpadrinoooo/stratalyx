# Per-investor valuation-strategy decisions

This is the canonical record of which strategy maps to which investor and
why. Update before adding a new investor or changing an existing mapping —
the strategies test enforces that every INVESTORS entry has a strategy.

## Mapping (22 → 9)

| Investor | Strategy | Rationale |
|---|---|---|
| Buffett, Munger, Pabrai, Smith, Li Lu, Ackman | `ownerEarningsTwoStageDCF` | Quality-compounder framework: discount free cash flow over an explicit high-growth phase + Gordon terminal. FCF as the owner-earnings proxy. Defaults: 5-year runway, 8% growth fallback, 2.5% terminal, market-cap-tiered discount rate (9/11/13%). |
| Graham, Schloss | `grahamWithNCAV` | Defensive-investor framework: floor at NCAV (deep-value liquidation), midpoint at the Graham number (sqrt(22.5·EPS·BVPS)), upside at 1.5× Graham (Graham's "speculative" ceiling). |
| Lynch, Fisher, Miller | `pegBasedFairValue` | Growth-at-reasonable-price: fair P/E = growth (pp) + yield (pp), capped at 30. Range = ±20% around the fair value to capture growth-rate uncertainty. Tolerates higher growth (clamped at 0.30 inside the wrapper, then 0.20 inside the primitive). |
| Klarman, Watsa, Burry, Einhorn | `assetFloorPlusDCF` | Margin-of-safety with downside protection: floor at NCAV (asset liquidation), midpoint at owner-earnings DCF, upside at DCF · 1.30. Falls back to DCF only when no balance sheet. |
| Cathie Wood | `aggressiveGrowthDCF` | Disruption-driven growth: longer 7-year high-growth phase, growth floor of 15% (Wood doesn't pick low-growth names), still capped at 20% by the primitive. |
| Druckenmiller, Soros | `macroAdjustedDCF` | Macro-overlay framework: same DCF as Buffett-style with a method label that flags the macro layer applies in the LLM narrative, not the deterministic numbers. We don't yet ingest macro indicators (rates curve, dollar index, GDP nowcasts). |
| Greenblatt | `magicFormulaScreen` | Earnings-yield target framework: fair price = EPS / 0.10 (the implicit Magic Formula screen for "cheap"). Range = ±15%. The Magic Formula is genuinely a comparative ranking system — the wrapper warns this is a single-stock approximation. |
| Templeton | `deepValueScreen` | "Maximum pessimism" framework: buy target at 50% of Graham number, NCAV as the floor, Graham as the upside. |
| Marks, Dalio | `noPerStockValuation` | Macro positioning + cycle awareness + risk parity. No per-stock IV by design. UI shows "Qualitative Analysis" for these — narrative carries the analysis. |

## Decisions worth flagging

### Owner earnings = FCF (not the classical Buffett definition)

Classical owner earnings = Net Income + D&A + non-cash charges − maintenance capex − working-capital change. We don't get a maintenance-vs-growth capex breakdown from FMP, so FCF (operating cash flow − total capex) is the closest tractable proxy and matches Buffett's later pragmatic usage.

**Risk:** for capital-intensive businesses where most capex is *growth* capex, FCF understates owner earnings and the DCF undervalues the company. **Mitigation:** Phase 9 share pages disclose "Owner earnings derived from FCF" and the LLM narrative is encouraged to flag heavy-capex businesses where this approximation breaks down.

### Discount rate buckets

Three-tier default: 9% (large cap, ≥$10B), 11% (mid, ≥$2B), 13% (small). No CAPM-style WACC computation. Rationale: deriving WACC needs a beta, an equity-risk-premium choice, and a cost-of-debt estimate, all of which are themselves judgment calls. A market-cap-tiered constant is cruder but more transparent — the user sees the discount rate in "Inputs used."

### Growth rate priority

1. Caller-supplied `earningsGrowthRate` (when the LLM context or human user provides one).
2. CAGR derived from `incomeHistory` (newest-first FMP convention).
3. 8% fallback with a warning ("Growth rate defaulted to 8% — no caller value, no usable income history").

### Branch coverage on `strategies.ts` is ~80%

Most uncovered branches are `?? null` defensive paths for absent balance-sheet fields. FMP's current proxy doesn't fetch `balance-sheet-statement`, so strategies that need it (`assetFloorPlusDCF`, `grahamWithNCAV`'s NCAV component) gracefully degrade to "DCF/Graham only" in production today. Phase 3.2's FMP service expansion will populate balance-sheet data and these branches become live.

### What this module does NOT do

- Doesn't fetch any data. Pure functions.
- Doesn't call the LLM. The pipeline (Phase 4.3, deferred) computes valuation FIRST, then prompts the LLM with `{data, computedValuation}` for narrative only.
- Doesn't persist anything. The `analyses` table (Phase 4.5, deferred) lives in Supabase.
- Doesn't render UI. The IV-range display + sensitivity grid + "inputs used" panel land in Phase 4.4 (deferred).

## Phase 4 acceptance status

- [x] 4.1: Pure primitives (twoStageDCF, grahamNumber, ncavPerShare, lynchFairValue) with helpers and full tests at ≥95% statement/line/function coverage.
- [x] 4.2: Per-investor strategy mapping (22 → 9 strategies).
- [ ] 4.3: Pipeline integration — server `/api/analyze` endpoint, LLM schema change, Zod validation.
- [ ] 4.4: UI display of IV range, sensitivity, methods page.
- [ ] 4.5: Persistence to Supabase `analyses` table.

Phase 9 (public share pages) remains gated by 4.3+4.4+4.5.
