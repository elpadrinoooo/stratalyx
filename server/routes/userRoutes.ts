import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../supabaseAdmin.js'
import { getSetting } from '../settings.js'
import type { AnalysisResult } from '../../src/types/index.js'

export const userRouter = Router()

const DEFAULT_FREE_LIMIT = 25

const DEFAULT_ENABLED_PROVIDERS = ['anthropic', 'openai', 'google', 'mistral']
const DEFAULT_ENABLED_MODELS: Record<string, string[]> = {
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5', 'claude-opus-4-5'],
  openai:    ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  google:    ['gemini-2.5-flash', 'gemini-2.5-pro'],
  mistral:   ['mistral-small-3.1', 'mistral-large-2'],
}

// GET /user/me — returns current user's tier, usage, and the LLM provider/model
// allowlist. Frontend uses these to hide disabled options.
userRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { tier, analysesThisMonth, isAdmin } = req.user
  const cap              = await getSetting<number>('free_tier_limit', DEFAULT_FREE_LIMIT)
  const enabledProviders = await getSetting<string[]>('enabled_providers', DEFAULT_ENABLED_PROVIDERS)
  const enabledModels    = await getSetting<Record<string, string[]>>('enabled_models', DEFAULT_ENABLED_MODELS)
  res.json({
    tier,
    analysesThisMonth,
    limit: tier === 'pro' ? null : cap,
    isAdmin,
    enabledProviders,
    enabledModels,
  })
})

// GET /user/analyses — returns the signed-in user's analyses keyed by
// `${ticker}:${investorId}`, matching the shape AppState.analyses uses on
// the client. Most-recent run wins when a user has re-analyzed the same pair.
userRouter.get('/analyses', async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('ticker, investor_id, result, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) {
      res.status(500).json({ error: 'Failed to load analyses' })
      return
    }

    const analyses: Record<string, AnalysisResult> = {}
    const watchlistRows = await supabaseAdmin
      .from('watchlist')
      .select('ticker')
      .eq('user_id', req.user.id)

    for (const row of data ?? []) {
      const ticker     = row.ticker as string
      const investorId = row.investor_id as string
      const result     = row.result as AnalysisResult | null
      if (!ticker || !investorId || !result) continue
      // Ascending order means later writes overwrite earlier — most-recent wins.
      analyses[`${ticker}:${investorId}`] = result
    }

    const watchlist = (watchlistRows.data ?? [])
      .map((r) => r.ticker as string)
      .filter(Boolean)

    res.json({ analyses, watchlist })
  } catch {
    res.status(500).json({ error: 'Failed to load analyses' })
  }
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
