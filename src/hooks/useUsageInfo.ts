import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface UsageInfo {
  tier: 'free' | 'pro'
  analysesThisMonth: number
  limit: number | null
  limitReached: boolean
}

export function useUsageInfo(): { usage: UsageInfo | null; refetch: () => void } {
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
        const data = await res.json() as { tier: 'free' | 'pro'; analysesThisMonth: number; limit: number | null }
        setUsage({
          tier: data.tier,
          analysesThisMonth: data.analysesThisMonth,
          limit: data.limit,
          limitReached: data.limit !== null && data.analysesThisMonth >= data.limit,
        })
      } catch {
        setUsage(null)
      }
    })()
  }, [])

  return { usage, refetch }
}
