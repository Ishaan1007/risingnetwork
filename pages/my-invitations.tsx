import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getSocket } from '../lib/socketClient'
import { CheckIcon, LoaderIcon, SearchIcon, UsersIcon, XIcon } from '../components/Icons'
import Skeleton from '../components/Skeleton'

type Invitation = {
  id: number
  status: string
  invited_at: string
  teams: {
    id: number
    name: string
    description: string
    colleges: {
      name: string
    }
  }
}

export default function MyInvitations() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [responding, setResponding] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let socketCleanup: (() => void) | null = null
    const fetchInvitations = async (token: string) => {
      try {
        const response = await fetch(`/api/invitations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const result = await response.json()

        if (!active) return

        if (response.ok) {
          setInvitations(result.invitations || [])
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to load invitations' })
        }
      } catch (err: any) {
        if (!active) return
        setMessage({ type: 'error', text: err.message || 'Failed to load invitations' })
      } finally {
        if (active) setLoading(false)
      }
    }

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/')
        return
      }

      setUserId(session.user.id)
      setAccessToken(session.access_token)

      // Fetch invitations
      await fetchInvitations(session.access_token)

      const socket = await getSocket()
      socket.emit('user:join', { userId: session.user.id })
      const handleInvite = () => fetchInvitations(session.access_token)
      socket.on('invite:received', handleInvite)
      socketCleanup = () => {
        socket.off('invite:received', handleInvite)
      }
    }

    init()
    return () => {
      active = false
      if (socketCleanup) socketCleanup()
    }
  }, [router])

  const handleResponse = async (invitationId: number, action: 'accept' | 'decline') => {
    setResponding(invitationId)
    setMessage(null)

    try {
      if (!accessToken) {
        throw new Error('Not authenticated')
      }
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          team_member_id: invitationId,
          action,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: action === 'accept' ? 'You joined the team!' : 'Invitation declined',
        })
        setTimeout(() => {
          setInvitations(invitations.filter((i) => i.id !== invitationId))
        }, 1000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to respond' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setResponding(null)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }} aria-busy="true" aria-live="polite">
        <Skeleton style={{ width: 190, height: 34, marginBottom: 24 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#f9fafb',
              }}
            >
              <Skeleton style={{ width: '46%', height: 20, marginBottom: 8 }} />
              <Skeleton style={{ width: '34%', height: 14, marginBottom: 10 }} />
              <Skeleton style={{ width: '100%', height: 14, marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Skeleton style={{ width: 70, height: 34 }} />
                <Skeleton style={{ width: 70, height: 34 }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Team Invitations</h1>

      {message && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 4,
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          {message.text}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>No pending invitations</h3>
          <p style={{ color: '#6b7280' }}>You don't have any pending invites right now.</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="icon-only" onClick={() => router.push('/teams')} aria-label="Browse Teams" title="Browse Teams">
              <UsersIcon size={18} />
            </button>
            <button className="icon-only" onClick={() => router.push('/explore')} aria-label="Find Freelancers" title="Find Freelancers" style={{ backgroundColor: '#0a66c2' }}>
              <SearchIcon size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0' }}>{invitation.teams.name}</h3>
              <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: 14 }}>
                {invitation.teams.colleges.name}
              </p>
              {invitation.teams.description && (
                <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#374151' }}>
                  {invitation.teams.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleResponse(invitation.id, 'accept')}
                  disabled={responding === invitation.id}
                  className="icon-only"
                  aria-label="Accept"
                  title="Accept"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {responding === invitation.id ? <span className="spin"><LoaderIcon size={16} /></span> : <CheckIcon size={16} />}
                </button>
                <button
                  onClick={() => handleResponse(invitation.id, 'decline')}
                  disabled={responding === invitation.id}
                  className="icon-only"
                  aria-label="Decline"
                  title="Decline"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {responding === invitation.id ? <span className="spin"><LoaderIcon size={16} /></span> : <XIcon size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
