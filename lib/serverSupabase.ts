import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Server-side client that respects RLS. Use for read-only or user-scoped operations.
export const supabaseServer = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
})

let cachedAdmin: ReturnType<typeof createClient> | null = null

// Admin client for operations that require the service role key (bypasses RLS).
export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  const key: string = serviceRoleKey
  cachedAdmin = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  })
  return cachedAdmin
}
