import type { Session, SupabaseClient } from '@supabase/supabase-js'

const AUTH_CALLBACK_PATH = '/auth/callback'
const INITIAL_AUTH_TIMEOUT_MS = 7000

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

type InitialSessionResult = {
  session: Session | null
  timedOut: boolean
  error: unknown | null
}

export const getInitialSession = async (
  client: SupabaseClient,
  timeoutMs = INITIAL_AUTH_TIMEOUT_MS
): Promise<InitialSessionResult> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const sessionPromise = client.auth
    .getSession()
    .then(({ data: { session } }) => ({
      session,
      timedOut: false,
      error: null,
    }))
    .catch((error: unknown) => ({
      session: null,
      timedOut: false,
      error,
    }))

  const timeoutPromise: Promise<InitialSessionResult> = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        session: null,
        timedOut: true,
        error: null,
      })
    }, timeoutMs)
  })

  const result = await Promise.race([sessionPromise, timeoutPromise])
  if (timeoutId) clearTimeout(timeoutId)
  return result
}
