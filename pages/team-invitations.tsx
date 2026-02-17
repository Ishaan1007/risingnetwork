import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { LoaderIcon, CheckIcon, XIcon } from '../components/Icons'
import Avatar from '../components/Avatar'

type TeamInvitation = {
  id: string
  team_id: number
  status: string
  created_at: string
  teams: {
    id: number
    name: string
    created_by: string
    profiles: {
      name: string
    }
  }
}

export default function TeamInvitations() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchInvitations = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          router.push('/')
          return
        }

        const response = await fetch('/api/teams/invitations', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result?.error || 'Failed to load invitations')
        }

        const result = await response.json()
        if (isMounted) setInvitations(result.invitations || [])
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load invitations')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchInvitations()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessing(invitationId)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/teams/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          action,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result?.error || 'Failed to update invitation')
      }

      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch (err: any) {
      setError(err?.message || 'Failed to update invitation')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <main className="rn-shell">
        <div role="status" aria-label="Loading" className="rn-loading">
          <span className="spin">
            <LoaderIcon size={20} />
          </span>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button 
          type="button" 
          onClick={() => router.back()}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: 8
          }}
        >
          <XIcon size={20} />
        </button>
        <h1 style={{ margin: 0 }}>Team Invitations</h1>
      </div>

      {error && (
        <div className="rn-message error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="rn-empty-card">
          <p>No pending team invitations</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {invitations.map((invitation) => (
            <div 
              key={invitation.id} 
              className="rn-card"
              style={{ 
                padding: 16, 
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                backgroundColor: '#fff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={48} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {invitation.teams.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                    Invited by {invitation.teams.profiles.name || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => handleInvitation(invitation.id, 'decline')}
                  disabled={processing === invitation.id}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    backgroundColor: '#fff',
                    cursor: processing === invitation.id ? 'not-allowed' : 'pointer',
                    opacity: processing === invitation.id ? 0.6 : 1,
                  }}
                >
                  {processing === invitation.id ? 'Processing...' : 'Decline'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInvitation(invitation.id, 'accept')}
                  disabled={processing === invitation.id}
                  className="rn-primary-btn"
                  style={{
                    padding: '8px 16px',
                    opacity: processing === invitation.id ? 0.6 : 1,
                    cursor: processing === invitation.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processing === invitation.id ? 'Processing...' : 'Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
