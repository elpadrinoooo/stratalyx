import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'

const FREE_LIMIT = 3

export function checkUsage(req: Request, res: Response, next: NextFunction): void {
  const user = req.user
  if (user && user.tier === 'free' && user.analysesThisMonth >= FREE_LIMIT) {
    res.status(402).json({
      error: 'Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.',
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
