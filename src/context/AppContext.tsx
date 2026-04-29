import React, { useReducer, useEffect } from 'react'
import { AppContext } from '../state/context'
import { reducer } from '../state/reducer'
import { loadState, saveState } from '../state/persist'
import { supabase } from '../lib/supabase'
import { migrateLocalStorageToSupabase } from '../lib/supabaseMigrate'

interface Props {
  children: React.ReactNode
  initialState?: ReturnType<typeof loadState>
}

const API_ORIGIN = import.meta.env['VITE_API_ORIGIN'] as string | undefined ?? ''

export function AppProvider({ children, initialState }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState ?? loadState())

  // ── Persist to localStorage (anonymous users / preferences) ─────────────────
  useEffect(() => {
    saveState(state, { skipUserData: state.user !== null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only persist when data fields change, not transient UI state
  }, [state.analyses, state.comparisons, state.watchlist, state.user])

  // ── Supabase auth listener ───────────────────────────────────────────────────
  useEffect(() => {
    type Profile = { tier: 'free' | 'pro'; analysesThisMonth: number; isAdmin?: boolean }
    const fetchProfile = async (token: string): Promise<Profile | null> => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) return null
        return await res.json() as Profile
      } catch { return null }
    }

    // Pull the user's persisted analyses + watchlist from Supabase. Required
    // because saveState() drops these slices from localStorage for signed-in
    // users (Supabase is the authoritative store), so without this fetch the
    // History/Watchlist screens render empty after every page reload.
    const hydrateUserData = async (token: string): Promise<void> => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/user/analyses`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) return
        const body = await res.json() as { analyses?: Record<string, unknown>; watchlist?: unknown[] }
        const analyses  = (body.analyses && typeof body.analyses === 'object') ? body.analyses as Record<string, import('../types').AnalysisResult> : {}
        const watchlist = Array.isArray(body.watchlist) ? body.watchlist.filter((t): t is string => typeof t === 'string') : []
        dispatch({ type: 'HYDRATE_USER_DATA', payload: { analyses, watchlist } })
      } catch { /* offline or transient — user can retry by refreshing */ }
    }

    // Hydrate session on mount (handles page refresh while logged in)
    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const token = data.session.access_token
        const userId = data.session.user.id
        const profile = await fetchProfile(token)
        dispatch({
          type: 'SET_USER',
          payload: {
            id: userId,
            email: data.session.user.email ?? '',
            tier: profile?.tier ?? 'free',
            isAdmin: Boolean(profile?.isAdmin),
          },
        })
        void hydrateUserData(token)
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const token = session.access_token
        const userId = session.user.id
        void (async () => {
          const profile = await fetchProfile(token)
          dispatch({
            type: 'SET_USER',
            payload: {
              id: userId,
              email: session.user.email ?? '',
              tier: profile?.tier ?? 'free',
              isAdmin: Boolean(profile?.isAdmin),
            },
          })
          await migrateLocalStorageToSupabase(userId, token, API_ORIGIN)
          void hydrateUserData(token)
        })()
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null })
      }
    })

    return () => { subscription.unsubscribe() }
  }, [])  

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}
