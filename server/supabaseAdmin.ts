import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url         = process.env['SUPABASE_URL']              ?? ''
const serviceRole = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

let client: SupabaseClient | null = null
if (url && serviceRole) {
  client = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
} else if (!process.env['JEST_WORKER_ID']) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth enforcement disabled')
}

/** True when both env vars are present and a real Supabase client exists. */
export const supabaseConfigured: boolean = client !== null

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!client) throw new Error('Supabase not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)')
    return Reflect.get(client, prop, client)
  },
})
