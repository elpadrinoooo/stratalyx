import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'
import { getSetting } from './settings.js'

// Default values — used when Supabase isn't configured (local dev / CI) or
// the app_settings row is missing. Admin can override at runtime via the
// admin Settings panel without redeploying.
const DEFAULT_FREE_LIMIT       = 25
const DEFAULT_MAX_PROMPT_CHARS = 32_000
const DEFAULT_ENABLED_PROVIDERS = ['anthropic', 'openai', 'google', 'mistral']
const DEFAULT_ENABLED_MODELS: Record<string, string[]> = {
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5', 'claude-opus-4-5'],
  openai:    ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  google:    ['gemini-2.5-flash', 'gemini-2.5-pro'],
  mistral:   ['mistral-small-3.1', 'mistral-large-2'],
}

/**
 * Build a middleware that rejects requests whose provider isn't currently
 * enabled (admin can flip a provider off without code changes). The model
 * check is left to each route's own model-allowlist logic — those already
 * fall back to a default when the user supplies something unknown.
 */
export function gateProvider(provider: string) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    if (IS_TEST) { next(); return }
    const enabled = await getSetting<string[]>('enabled_providers', DEFAULT_ENABLED_PROVIDERS)
    if (!enabled.includes(provider)) {
      res.status(403).json({
        error: `${provider} is currently disabled by an admin.`,
        code: 'PROVIDER_DISABLED',
      })
      return
    }
    next()
  }
}

/** Helper for handlers that build their model allowlist dynamically. */
export async function getEnabledModelsForProvider(provider: string): Promise<string[]> {
  const all = await getSetting<Record<string, string[]>>('enabled_models', DEFAULT_ENABLED_MODELS)
  return all[provider] ?? []
}

// Same skip pattern as the rate limiters in server/app.ts — bypass auth gating
// inside Jest so the existing input/upstream/proxy tests don't all 401.
const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])

export async function validatePromptSize(req: Request, res: Response, next: NextFunction): Promise<void> {
  const prompt = (req.body as { prompt?: unknown } | undefined)?.prompt
  if (typeof prompt === 'string') {
    const limit = await getSetting('prompt_max_chars', DEFAULT_MAX_PROMPT_CHARS)
    if (prompt.length > limit) {
      res.status(413).json({
        error: `Prompt too large (${prompt.length} chars; limit ${limit}).`,
        code: 'PROMPT_TOO_LARGE',
      })
      return
    }
  }
  next()
}

/**
 * Gate the LLM proxy routes: require a signed-in user and enforce the free-tier
 * monthly cap. Anonymous requests are rejected with 401 — without this, anyone
 * on the internet could hit /api/claude unlimited times and burn the Anthropic
 * bill (verified via direct probe before this fix).
 */
export async function checkUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user
  if (!user && !IS_TEST) {
    res.status(401).json({
      error: 'Sign in required to run analyses.',
      code: 'AUTH_REQUIRED',
    })
    return
  }
  if (user && user.tier === 'free') {
    const cap = await getSetting('free_tier_limit', DEFAULT_FREE_LIMIT)
    if (user.analysesThisMonth >= cap) {
      res.status(402).json({
        error: 'Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.',
        code: 'USAGE_LIMIT_REACHED',
      })
      return
    }
  }
  next()
}

interface AnalysisFlywheelPayload {
  ticker: string
  investorId: string
  score?: number | null
  verdict?: string | null
  result: unknown
  priceAtAnalysis?: number | null
  // Cost-tracking — populated by each LLM proxy handler.
  provider?: string | null
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  costUsdMicro?: number | null
}

export function recordAnalysis(
  userId: string | null,
  payload: AnalysisFlywheelPayload
): void {
  // No-op when Supabase isn't configured — matches the boot-time
  // "auth enforcement disabled" warning. Lets local dev and CI run
  // the LLM proxy routes without writing to a database.
  if (!supabaseConfigured) return

  const run = async (): Promise<void> => {
    try {
      await supabaseAdmin.from('analyses').insert({
        ticker: payload.ticker,
        investor_id: payload.investorId,
        score: payload.score ?? null,
        verdict: payload.verdict ?? null,
        result: payload.result,
        price_at_analysis: payload.priceAtAnalysis ?? null,
        user_id: userId,
        provider:       payload.provider       ?? null,
        model:          payload.model          ?? null,
        input_tokens:   payload.inputTokens    ?? null,
        output_tokens:  payload.outputTokens   ?? null,
        cost_usd_micro: payload.costUsdMicro   ?? null,
      })

      if (userId) {
        const { data: u } = await supabaseAdmin
          .from('users')
          .select('analyses_this_month')
          .eq('id', userId)
          .single()
        if (u) {
          await supabaseAdmin
            .from('users')
            .update({ analyses_this_month: (u.analyses_this_month as number) + 1 })
            .eq('id', userId)
        }
      }
    } catch (err) {
      // Background flywheel — failures shouldn't crash the request that triggered it
      console.error('[usageLimiter] recordAnalysis failed:', err instanceof Error ? err.message : err)
    }
  }
  void run()
}
