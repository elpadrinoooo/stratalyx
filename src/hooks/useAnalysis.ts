import { useState, useCallback } from 'react'
import { runAnalysis } from '../engine/analyze'
import { useApp } from '../state/context'
import { INV } from '../constants/investors'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { captureError } from '../lib/sentry'

export type AnalysisPhase = 'idle' | 'running' | 'done' | 'error'

interface UseAnalysisReturn {
  phase: AnalysisPhase
  error: string
  run: (ticker: string) => Promise<void>
}

export function useAnalysis(): UseAnalysisReturn {
  const { state, dispatch } = useApp()
  const [phase, setPhase]   = useState<AnalysisPhase>('idle')
  const [error, setError]   = useState('')

  const run = useCallback(async (ticker: string) => {
    const sym = ticker.trim().toUpperCase()
    if (!sym) return

    const investor = INV[state.investor]
    if (!investor) {
      setError('No investor selected')
      setPhase('error')
      return
    }

    track('ticker_searched', { ticker: sym })
    setPhase('running')
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token ?? null

      const result = await runAnalysis({
        ticker: sym,
        investor,
        provider: state.provider,
        model: state.model,
        authToken,
      })

      dispatch({ type: 'SET_ANALYSIS', payload: result })
      dispatch({
        type: 'TOAST',
        payload: { message: `${sym} analyzed via ${investor.shortName} framework`, type: 'success' },
      })
      track('analysis_run', {
        ticker: sym, investor_id: investor.id,
        provider: state.provider, model: state.model, success: true,
      })
      setPhase('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      setPhase('error')

      const lower = msg.toLowerCase()
      const isLimit    = lower.includes('monthly analysis limit')
      const needsAuth  = lower.includes('sign in required')
      track('analysis_run', {
        ticker: sym, investor_id: investor.id,
        provider: state.provider, model: state.model, success: false,
      })
      // Only report to Sentry for unexpected failures — auth nudges and quota
      // exhaustion are normal flow control, not errors worth waking anyone up.
      if (!isLimit && !needsAuth) captureError(err, { ticker: sym, investor: investor.id })

      if (needsAuth) {
        // Surface a friendlier nudge and pop the auth modal so the user can
        // sign in without hunting for the navbar button.
        dispatch({ type: 'TOAST', payload: {
          message: 'Sign in to run an analysis — your first 25 are free each month.',
          type: 'info',
        } })
        window.dispatchEvent(new CustomEvent('stratalyx:request-auth'))
      } else {
        dispatch({ type: 'TOAST', payload: { message: msg, type: isLimit ? 'info' : 'error' } })
      }
    }
  }, [state.investor, state.provider, state.model, dispatch])

  return { phase, error, run }
}
