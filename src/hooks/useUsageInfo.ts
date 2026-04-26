import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface UsageInfo {
  tier: 'free' | 'pro'
  analysesThisMonth: number
  limit: number | null
  limitReached: boolean
  enabledProviders?: string[]
  enabledModels?: Record<string, string[]>
}

/**
 * Fetches the signed-in user's tier + analyses-this-month from /api/user/me.
 * Auto-fetches on mount; pass an `event` value (e.g. modalOpen) to re-fetch
 * whenever it changes — used to refresh after an analysis runs.
 */
export function useUsageInfo(event?: unknown): { usage: UsageInfo | null; refetch: () => void } {
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  const refetch = useCallback((): void => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setUsage(null); return }

      try {
        const res = await fetch('/api/user/me', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (!res.ok) { setUsage(null); return }
        const data = await res.json() as {
          tier: 'free' | 'pro'
          analysesThisMonth: number
          limit: number | null
          enabledProviders?: string[]
          enabledModels?: Record<string, string[]>
        }
        setUsage({
          tier: data.tier,
          analysesThisMonth: data.analysesThisMonth,
          limit: data.limit,
          limitReached: data.limit !== null && data.analysesThisMonth >= data.limit,
          enabledProviders: data.enabledProviders,
          enabledModels: data.enabledModels,
        })
      } catch {
        setUsage(null)
      }
    })()
  }, [])

  useEffect(() => { refetch() }, [refetch, event])

  return { usage, refetch }
}
