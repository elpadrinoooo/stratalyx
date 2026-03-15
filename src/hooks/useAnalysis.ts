import { useState, useCallback } from 'react'
import { runAnalysis } from '../engine/analyze'
import { useApp } from '../state/context'
import { INV } from '../constants/investors'

export type AnalysisPhase = 'idle' | 'running' | 'done' | 'error'

interface UseAnalysisReturn {
  phase: AnalysisPhase
  error: string
  run: (ticker: string, fmpKey: string) => Promise<void>
}

export function useAnalysis(): UseAnalysisReturn {
  const { state, dispatch } = useApp()
  const [phase, setPhase]   = useState<AnalysisPhase>('idle')
  const [error, setError]   = useState('')

  const run = useCallback(async (ticker: string, fmpKey: string) => {
    const sym = ticker.trim().toUpperCase()
    if (!sym) return

    const investor = INV[state.investor]
    if (!investor) {
      setError('No investor selected')
      setPhase('error')
      return
    }

    setPhase('running')
    setError('')

    try {
      const result = await runAnalysis({
        ticker: sym,
        investor,
        provider: state.provider,
        model: state.model,
        fmpKey: fmpKey || null,
      })

      dispatch({ type: 'SET_ANALYSIS', payload: result })
      dispatch({
        type: 'TOAST',
        payload: { message: `${sym} analyzed via ${investor.shortName} framework`, type: 'success' },
      })
      setPhase('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      setPhase('error')
      dispatch({ type: 'TOAST', payload: { message: msg, type: 'error' } })
    }
  }, [state.investor, state.provider, state.model, dispatch])

  return { phase, error, run }
}
