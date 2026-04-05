import type { Investor } from '../types'

/** Build the full LLM prompt for a given ticker, investor, and optional live data block. */
export function buildPrompt(
  ticker: string,
  investor: Investor,
  liveDataBlock: string | null,
): string {
  const liveSection = liveDataBlock
    ? `\n\nThe following REAL-TIME financial data has been retrieved from Financial Modeling Prep (FMP). Use it as your primary data source for all quantitative metrics. If the live data contradicts your training data, trust the live data.\n\n${liveDataBlock}\n`
    : '\n\nNote: No live financial data is available. Use your training knowledge for this analysis, clearly flagging that data may be dated.\n'

  return `${investor.ctx}${liveSection}

Analyse ${ticker} by applying the documented investment framework described above. Apply every rule and equation in the methodology rigorously and honestly. Write all output in third person (e.g. "Under this framework..." or "The ${investor.name} criteria suggest..."). Do not write as if you are ${investor.name}.

You MUST respond with a single valid JSON object — no prose before or after it. Do not wrap it in markdown code blocks. Every field is required.

{
  "strategyScore":      <integer 0–10, honest assessment of how well this stock fits the framework>,
  "verdict":            <"BUY" | "HOLD" | "AVOID">,
  "verdictReason":      <one clear sentence explaining the framework alignment verdict>,
  "marketPrice":        <current price as a number, or 0 if unknown>,
  "intrinsicValueLow":  <conservative intrinsic value under this framework's assumptions, or 0>,
  "intrinsicValueHigh": <optimistic intrinsic value under this framework's assumptions, or 0>,
  "marginOfSafety":     <margin of safety as a percentage 0–100, or 0>,
  "moSUp":              <true if price is below intrinsic value, false otherwise>,
  "moat":               <"Wide" | "Narrow" | "None">,
  "moatScore":          <integer 0–10>,
  "screenResults": [
    { "rule": "<rule label>", "pass": <true|false>, "note": "<one sentence>" }
    /* include one entry per rule in the framework */
  ],
  "strengths": [
    /* up to 5 strings — key strengths through this framework's lens */
  ],
  "risks": [
    /* up to 4 strings — key risks through this framework's lens */
  ],
  "thesis":    <2–4 sentence investment thesis written in third person, describing framework alignment>,
  "roe":       <return on equity as a decimal, e.g. 0.35 for 35%, or 0>,
  "pe":        <P/E ratio as a number, or 0>,
  "peg":       <PEG ratio as a number, or 0>,
  "margin":    <net profit margin as a decimal, e.g. 0.21 for 21%, or 0>,
  "debtLevel": <"Low" | "Moderate" | "High">,
  "div":       <dividend yield as a decimal, e.g. 0.015 for 1.5%, or 0>,
  "fcf":       <free cash flow in billions as a number, or 0>
}`
}
