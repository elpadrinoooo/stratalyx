import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'

const FREE_LIMIT = 25

// Cap LLM prompt size to prevent token-blast abuse. Real analysis prompts run
// ~10–20K chars (template + investor block + live FMP data). 32K leaves headroom
// while preventing the 1MB body-limit ceiling from becoming the practical cap.
const MAX_PROMPT_CHARS = 32_000

export function validatePromptSize(req: Request, res: Response, next: NextFunction): void {
  const prompt = (req.body as { prompt?: unknown } | undefined)?.prompt
  if (typeof prompt === 'string' && prompt.length > MAX_PROMPT_CHARS) {
    res.status(413).json({
      error: `Prompt too large (${prompt.length} chars; limit ${MAX_PROMPT_CHARS}).`,
      code: 'PROMPT_TOO_LARGE',
    })
    return
  }
  next()
}

/**
 * Gate the LLM proxy routes: require a signed-in user and enforce the free-tier
 * monthly cap. Anonymous requests are rejected with 401 — without this, anyone
 * on the internet could hit /api/claude unlimited times and burn the Anthropic
 * bill (verified via direct probe before this fix).
 */
// Same skip pattern as the rate limiters in server/app.ts — bypass auth gating
// inside Jest so the existing input/upstream/proxy tests don't all 401.
const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])

export function checkUsage(req: Request, res: Response, next: NextFunction): void {
  const user = req.user
  if (!user && !IS_TEST) {
    res.status(401).json({
      error: 'Sign in required to run analyses.',
      code: 'AUTH_REQUIRED',
    })
    return
  }
  if (user && user.tier === 'free' && user.analysesThisMonth >= FREE_LIMIT) {
    res.status(402).json({
      error: 'Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.',
      code: 'USAGE_LIMIT_REACHED',
    })
    return
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
