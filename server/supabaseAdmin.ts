import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url         = process.env['SUPABASE_URL']              ?? ''
const serviceRole = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

let client: SupabaseClient | null = null
if (url && serviceRole) {
  client = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
} else {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth enforcement disabled')
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!client) throw new Error('Supabase not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)')
    return Reflect.get(client, prop, client)
  },
})
