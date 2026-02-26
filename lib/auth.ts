import type { SupabaseClient } from '@supabase/supabase-js'

const AUTH_CALLBACK_PATH = '/auth/callback'

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '')

export const getOAuthRedirectTo = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${AUTH_CALLBACK_PATH}`
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredBaseUrl) {
    return `${normalizeBaseUrl(configuredBaseUrl)}${AUTH_CALLBACK_PATH}`
  }

  return undefined
}

export const signInWithGoogle = async (client: SupabaseClient) => {
  const redirectTo = getOAuthRedirectTo()

  return client.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  })
}
