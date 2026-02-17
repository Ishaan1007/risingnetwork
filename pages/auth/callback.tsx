import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { syncProfilePicture } from '../../lib/gravatar'

export default function AuthCallback() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasCompleteName, setHasCompleteName] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          
          // Sync profile picture from Google/Gravatar
          const profilePicture = syncProfilePicture(session.user)
          
          // Get name from Google profile
          const googleName =
            session.user.user_metadata?.name ||
            [session.user.user_metadata?.given_name, session.user.user_metadata?.family_name]
              .filter(Boolean)
              .join(' ')
          
          // Check if user has existing profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (existingProfile) {
            // Update existing profile with Google data if fields are empty
            const updateData: any = {
              updated_at: new Date().toISOString()
            }
            
            if (profilePicture && !existingProfile.avatar_url) {
              updateData.avatar_url = profilePicture
            }
            
            if (googleName && !existingProfile.name) {
              updateData.name = googleName
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 1) { // More than just updated_at
              await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', session.user.id)
            }
          } else {
            // Create new profile with Google data
            const newProfileData: any = {
              id: session.user.id,
              name: googleName || 'User',
              bio: '',
              city: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            if (profilePicture) {
              newProfileData.avatar_url = profilePicture
            }
            
            await supabase
              .from('profiles')
              .insert(newProfileData)
          }
          
          // Check if user has a complete name (either from Google or database)
          const hasCompleteName = Boolean(googleName || existingProfile?.name)
          
          const displayName = googleName || existingProfile?.name || 'User'
          
          // Set state for rendering
          setHasCompleteName(hasCompleteName)
          setDisplayName(displayName)
          
          if (!hasCompleteName) {
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
        <p>Setting up your profile...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      {user && !hasCompleteName && (
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
      
      {user && hasCompleteName && (
        <div style={{ 
          backgroundColor: '#10b981', 
          border: '1px solid #059669', 
          borderRadius: 8, 
          padding: 16,
          maxWidth: 400
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#059669' }}>
            Welcome back, {displayName}! 👋
          </h3>
          <p style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Your profile has been set up with your Google account information.
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
