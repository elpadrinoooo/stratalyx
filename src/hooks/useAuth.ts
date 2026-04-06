import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UseAuthReturn {
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hydrate from existing session (handles page refresh)
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })

    return () => { subscription.unsubscribe() }
  }, [])

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }

  return { session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }
}
