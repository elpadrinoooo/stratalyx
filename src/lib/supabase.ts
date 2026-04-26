import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url  = import.meta.env['VITE_SUPABASE_URL']  as string | undefined
const anon = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined

let client: SupabaseClient | null = null
if (url && anon) {
  client = createClient(url, anon)
} else {
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth disabled (anonymous mode)')
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!client) {
      // Return safe no-ops for the call sites used during boot so the app stays usable in anonymous mode.
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOtp: () => Promise.reject(new Error('Auth not configured')),
          signInWithPassword: () => Promise.reject(new Error('Auth not configured')),
          signUp: () => Promise.reject(new Error('Auth not configured')),
          signOut: () => Promise.resolve({ error: null }),
        }
      }
      throw new Error('Supabase not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)')
    }
    return Reflect.get(client, prop, client)
  },
})
