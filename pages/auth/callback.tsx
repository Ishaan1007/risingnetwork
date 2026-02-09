import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatically handles the code exchange
      // Just wait a moment and redirect to profile
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push('/profile')
    }

    handleCallback()
  }, [router])

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p>Signing in...</p>
    </div>
  )
}
