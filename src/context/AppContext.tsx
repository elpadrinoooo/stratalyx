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
          void migrateLocalStorageToSupabase(userId, token, API_ORIGIN)
        })()
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null })
      }
    })

    return () => { subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}
