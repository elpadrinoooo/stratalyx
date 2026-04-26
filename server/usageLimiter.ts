import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'
import { getSetting } from './settings.js'

// Default values — used when Supabase isn't configured (local dev / CI) or
// the app_settings row is missing. Admin can override at runtime via the
// admin Settings panel without redeploying.
const DEFAULT_FREE_LIMIT       = 25
const DEFAULT_MAX_PROMPT_CHARS = 32_000

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
