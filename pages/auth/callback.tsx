import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          
          // Check if user has first_name
          if (!session.user.user_metadata?.first_name) {
            // Redirect to profile with name prompt
            router.push('/profile?reason=name')
          } else {
            // User has name, redirect to normal profile
            router.push('/profile')
          }
        } else {
          // No session, redirect to home
          router.push('/')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Signing in...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      {user && !user.user_metadata?.first_name && (
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #3b82f6', 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 16,
          maxWidth: 400
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e40af' }}>
            Welcome to RisingNetwork! 🎉
          </h3>
          <p style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Please fill in your name to get started with your profile.
          </p>
          <button 
            onClick={() => router.push('/profile')}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            Go to Profile
          </button>
        </div>
      )}
      
      {user && user.user_metadata?.first_name && (
        <div style={{ 
          backgroundColor: '#10b981', 
          border: '1px solid #059669', 
          borderRadius: 8, 
          padding: 16,
          maxWidth: 400
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#059669' }}>
            Welcome back, {user.user_metadata.first_name}! 👋
          </h3>
          <p style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Your profile is ready. Continue exploring or update your information.
          </p>
          <button 
            onClick={() => router.push('/profile')}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            Go to Profile
          </button>
        </div>
      )}
    </div>
  )
}
