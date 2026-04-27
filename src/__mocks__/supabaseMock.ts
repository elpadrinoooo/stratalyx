/**
 * Jest mock for src/lib/supabase.ts.
 *
 * The real module reads `import.meta.env` at module load, which ts-jest in
 * CommonJS mode can't compile. Tests don't actually need a working Supabase
 * client — they just need the surface area: getSession returning null, an
 * onAuthStateChange that returns an unsubscribe handle, and stub auth methods
 * that reject so any accidental call is loud.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const noop = (): void => {}

const fakeAuth = {
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: noop } } }),
  signInWithOtp:      () => Promise.reject(new Error('Auth not configured (test mock)')),
  signInWithPassword: () => Promise.reject(new Error('Auth not configured (test mock)')),
  signUp:             () => Promise.reject(new Error('Auth not configured (test mock)')),
  signOut:            () => Promise.resolve({ error: null }),
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (prop === 'auth') return fakeAuth
    throw new Error(`supabase mock: unexpected property access "${String(prop)}"`)
  },
})
