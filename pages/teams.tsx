import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { LoaderIcon, PlusIcon, GoogleMeetIcon } from '../components/Icons'
import Avatar from '../components/Avatar'
import ScheduleMeetModal from '../components/ScheduleMeetModal'

type ConnectedFriend = {
  id: string
  first_name: string
  last_name: string
  full_name: string
}

type Team = {
  id: number
  name: string
  description: string
  max_members: number
  member_count: number
  created_at: string
}

export default function Teams() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [connectedFriends, setConnectedFriends] = useState<ConnectedFriend[]>([])
  const [loading, setLoading] = useState(true)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'friends' | 'teams'>('friends')
  const [error, setError] = useState<string | null>(null)
  const [showMeetModal, setShowMeetModal] = useState(false)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const init = async () => {
      try {
        setLoading(true)
        setError(null)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (isMounted) {
            setLoading(false)
          }
          router.push('/')
          return
        }

        const { data: collegeInfo, error: collegeError } = await supabase
          .from('college_info')
          .select('college_id')
          .eq('user_id', session.user.id)
          .single()

        if (collegeError) {
          throw collegeError
        }

        if (!collegeInfo) {
          if (isMounted) setLoading(false)
          return
        }

        if (isMounted) setCollegeId(collegeInfo.college_id)

        // Fetch connected friends
        const { data: connections, error: connectionsError } = await supabase
          .from('connections')
          .select(`
            recipient_id,
            requester_id,
            recipient:profiles!connections_recipient_id_fkey (
              id,
              first_name,
              last_name
            ),
            requester:profiles!connections_requester_id_fkey (
              id,
              first_name,
              last_name
            )
          `)
          .eq('status', 'accepted')
          .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)

        if (connectionsError) {
          console.error('Error fetching connections:', connectionsError)
        } else if (connections && isMounted) {
          const friends: ConnectedFriend[] = connections
            .map((conn: any) => {
              const friend = conn.requester_id === session.user.id ? conn.recipient : conn.requester
              return {
                id: friend.id,
                first_name: friend.first_name,
                last_name: friend.last_name,
                full_name: `${friend.first_name} ${friend.last_name}`.trim() || 'Unknown'
              }
            })
            .filter((friend: ConnectedFriend) => friend.id !== session.user.id)
          
          setConnectedFriends(friends)
        }

        const response = await fetch(`/api/teams?college_id=${collegeInfo.college_id}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result?.error || 'Failed to load teams')
        }

        const result = await response.json()
        if (isMounted) setTeams(result.teams || [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          if (isMounted) setError(err?.message || 'Failed to load teams')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [router])

  const handleScheduleMeet = async (meetingData: any) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id,
        },
        body: JSON.stringify(meetingData),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to schedule meeting')
      }

      const result = await response.json()
      console.log('Meeting scheduled:', result)
      alert(`Google Meet scheduled successfully! Meet link: ${result.meet_link}`)
    } catch (error: any) {
      console.error('Error scheduling meeting:', error)
      alert(error.message || 'Failed to schedule meeting')
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

  if (!collegeId) {
    return (
      <main className="rn-shell">
        <div className="rn-empty">
          <h3>Complete Your College Information</h3>
          <p>To view and create teams, you need to set your college first.</p>
          <button onClick={() => router.push('/profile')} className="rn-primary-btn" style={{ marginTop: 12 }}>
            Go to Profile
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="rn-teams-shell">
      <div className="rn-teams-header">
        <h1>Teams</h1>
      </div>

      <div className="rn-tabs">
        <button
          className={`rn-tab ${activeTab === 'friends' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('friends')}
          type="button"
        >
          Connected Friends
        </button>
        <button
          className={`rn-tab ${activeTab === 'teams' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('teams')}
          type="button"
        >
          My Teams
        </button>
      </div>

      {error && (
        <div className="rn-message error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {activeTab === 'friends' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="rn-count">{connectedFriends.length} friends connected</p>
            <button 
              className="rn-primary-btn" 
              onClick={() => setShowMeetModal(true)}
              type="button"
            >
              <GoogleMeetIcon size={16} />
              Schedule Meet
            </button>
          </div>
          {connectedFriends.length === 0 ? (
            <div className="rn-empty-card">
              <p>No connected friends yet.</p>
            </div>
          ) : (
            <div className="rn-friends-grid">
              {connectedFriends.map((friend: ConnectedFriend) => (
                <div key={friend.id} className="rn-friend-card">
                  <Avatar size={72} />
                  <h3>{friend.full_name}</h3>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button 
                      type="button" 
                      className="rn-link-btn"
                      onClick={() => router.push(`/profiles/${friend.id}`)}
                    >
                      View Profile
                    </button>
                    <button 
                      className="rn-primary-btn"
                      onClick={() => {
                        setShowMeetModal(true)
                        // Pre-select this friend for meeting
                      }}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      <GoogleMeetIcon size={12} />
                      Meet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rn-teams-bar">
            <span className="rn-count">{teams.length} teams created</span>
            <div className="rn-teams-actions">
              <div className="rn-select-wrap rn-compact-select">
                <select aria-label="Sort teams">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="members">Most members</option>
                </select>
              </div>
              <button className="rn-primary-btn" onClick={() => router.push('/create-team')} type="button">
                <PlusIcon size={16} />
                Create Team
              </button>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="rn-empty-card">
              <div className="rn-empty-icon">
                <PlusIcon size={28} />
              </div>
              <p>No teams created yet</p>
              <button className="rn-primary-btn" onClick={() => router.push('/create-team')} type="button">
                <PlusIcon size={16} />
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="rn-team-grid">
              {teams.map((team) => (
                <div key={team.id} className="rn-team-card" onClick={() => router.push(`/teams/${team.id}`)}>
                  <h3>{team.name}</h3>
                  <p>{team.description || '(No description)'}</p>
                  <div className="rn-team-meta">
                    <span>
                      {team.member_count} / {team.max_members} members
                    </span>
                    <button
                      type="button"
                      className="rn-link-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/teams/${team.id}`)
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ScheduleMeetModal
        isOpen={showMeetModal}
        onClose={() => setShowMeetModal(false)}
        participants={connectedFriends}
        onSchedule={handleScheduleMeet}
      />
    </main>
  )
}
