import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../supabaseAdmin.js'
import type { AnalysisResult } from '../../src/types/index.js'

export const userRouter = Router()

const FREE_LIMIT = 25

// GET /user/me — returns current user's tier and usage
userRouter.get('/me', (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { tier, analysesThisMonth, isAdmin } = req.user
  res.json({
    tier,
    analysesThisMonth,
    limit: tier === 'pro' ? null : FREE_LIMIT,
    isAdmin,
  })
})

// POST /user/migrate — one-shot migration of localStorage state to Supabase
userRouter.post('/migrate', async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const userId = req.user.id
  const body = req.body as {
    analyses?: Record<string, AnalysisResult>
    watchlist?: string[]
  }

  let migratedAnalyses = 0
  let migratedWatchlist = 0

  try {
    // Migrate watchlist
    if (Array.isArray(body.watchlist) && body.watchlist.length > 0) {
      const rows = body.watchlist.map((ticker: string) => ({
        user_id: userId,
        ticker,
      }))
      const { error } = await supabaseAdmin
        .from('watchlist')
        .upsert(rows, { onConflict: 'user_id,ticker', ignoreDuplicates: true })
      if (!error) migratedWatchlist = rows.length
    }

    // Migrate analyses
    if (body.analyses && typeof body.analyses === 'object') {
      const analysisRows = Object.values(body.analyses).map((r) => ({
        ticker: r.ticker,
        investor_id: r.investorId,
        score: typeof r.strategyScore === 'number' ? r.strategyScore : null,
        verdict: r.verdict ?? null,
        result: r as unknown,
        price_at_analysis: r.liveData?.quote?.price ?? null,
        user_id: userId,
      }))
      if (analysisRows.length > 0) {
        const { error } = await supabaseAdmin
          .from('analyses')
          .insert(analysisRows)
        if (!error) migratedAnalyses = analysisRows.length
      }
    }

    res.json({ migratedAnalyses, migratedWatchlist })
  } catch {
    res.status(500).json({ error: 'Migration failed' })
  }
})
