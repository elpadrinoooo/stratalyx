import { createClient } from '@supabase/supabase-js'

const url         = process.env['SUPABASE_URL']              ?? ''
const serviceRole = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

if (!url || !serviceRole) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth enforcement disabled')
}

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
})
