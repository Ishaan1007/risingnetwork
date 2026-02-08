import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing Supabase server environment variables')
}

export const supabaseServer = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
})
