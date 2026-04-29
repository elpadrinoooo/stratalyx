import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/** Single live row — matches the server payload shape (server/app.ts /market-snapshot). */
export interface SnapshotRow {
  symbol:            string
  name:              string
  price:             number
  change:            number
  changesPercentage: number
  exchange:          string
}

export interface MarketSnapshot {
  gainers:    SnapshotRow[]
  losers:     SnapshotRow[]
  mostActive: SnapshotRow[]
  asOf:       string
}

export type SnapshotState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready';  data: MarketSnapshot; lastUpdated: Date }
  | { kind: 'error';  message: string; lastUpdated?: Date; data?: MarketSnapshot }
  | { kind: 'unauth' }

const REFRESH_MS = 60_000  // mirror the server's 60-second cache TTL

/**
 * Polls /api/market-snapshot every 60 seconds while `enabled` is true.
 * Mirrors the server cache window so we don't waste round-trips. Pauses
 * polling when `enabled` is false so the hook is cheap to leave mounted.
 *
 * The hook keeps the previous payload visible during refresh ("ready" stays
 * ready while the next fetch is in flight) so users don't see a flicker
 * every minute.
 */
export function useMarketSnapshot(enabled: boolean): { state: SnapshotState; refresh: () => void } {
  const [state, setState] = useState<SnapshotState>({ kind: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inFlightRef = useRef(false)

  const fetchOnce = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const headers: Record<string, string> = {}
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const r = await fetch('/api/market-snapshot', { headers })
      if (r.status === 401) { setState({ kind: 'unauth' }); return }
      if (!r.ok) throw new Error(`Market snapshot unavailable (${r.status})`)
      const data = await r.json() as MarketSnapshot
      setState({ kind: 'ready', data, lastUpdated: new Date() })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load live data'
      // Preserve last-known data so the user keeps seeing rows during transient errors.
      setState((prev) => prev.kind === 'ready'
        ? { kind: 'error', message, lastUpdated: prev.lastUpdated, data: prev.data }
        : { kind: 'error', message })
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    setState({ kind: 'loading' })
    void fetchOnce()
    intervalRef.current = setInterval(() => { void fetchOnce() }, REFRESH_MS)
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [enabled, fetchOnce])

  return { state, refresh: () => { void fetchOnce() } }
}
