/**
 * LLM cost rates per million tokens (USD).
 *
 * Mirrors src/constants/providers.ts. Update both together when rates change
 * (rates are reasonably stable but providers do shift them, so consider this
 * a once-per-quarter maintenance touchpoint).
 *
 * Stored cost on each analysis is in MICRO-CENTS (USD × 100,000) so the column
 * is bigint and free of floating-point drift across millions of rows.
 *
 * Usage example:
 *   const cost = computeCostMicroCents(model, inputTokens, outputTokens)
 *   recordAnalysis(userId, { ..., provider, model, inputTokens, outputTokens, costUsdMicro: cost })
 */

interface Rate { input: number; output: number }

// Rates in USD per 1,000,000 tokens.
const RATES: Record<string, Rate> = {
  // Anthropic
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5':         { input: 3.00, output: 15.00 },
  'claude-opus-4-5':           { input: 15.00, output: 75.00 },

  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
  'o3-mini':     { input: 1.10, output: 4.40 },

  // Google Gemini
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.5-pro':   { input: 1.25, output: 10.00 },

  // Mistral
  'mistral-small-3.1': { input: 0.10, output: 0.30 },
  'mistral-large-2':   { input: 2.00, output: 6.00 },
}

/** USD × 100,000. Returns 0 if the model is unknown. */
export function computeCostMicroCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const r = RATES[model]
  if (!r) return 0
  // (tokens / 1e6) × USD per 1M × 100,000 micro-cents per USD
  // → tokens × USD / 10
  const inUsd  = (inputTokens  * r.input)  / 1_000_000
  const outUsd = (outputTokens * r.output) / 1_000_000
  return Math.round((inUsd + outUsd) * 100_000)
}
