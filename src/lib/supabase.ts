import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env['VITE_SUPABASE_URL']  as string | undefined
const anon = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined

if (!url || !anon) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env')
}

export const supabase = createClient(url, anon)
