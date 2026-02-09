import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { PlusIcon, UserPlusIcon } from '../components/Icons'
import Avatar from '../components/Avatar'

type ConnectedFriend = {
  id: string
  first_name: string
  last_name: string
  full_name: string
}

export default function CreateTeam() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [connectedFriends, setConnectedFriends] = useState<ConnectedFriend[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/')
        return
      }

      setUserId(session.user.id)

      // Get user's college
      const { data: collegeInfo } = await supabase
        .from('college_info')
        .select('college_id')
        .eq('user_id', session.user.id)
        .single()

      if (!collegeInfo) {
        setMessage({ type: 'error', text: 'You must be a student with a college to create a team.' })
        setLoading(false)
        return
      }

      setCollegeId(collegeInfo.college_id)

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
      } else if (connections) {
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

      setLoading(false)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Team name is required' })
      return
    }

    if (!collegeId || !userId) {
      setMessage({ type: 'error', text: 'Missing college or user info' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Create team
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          college_id: collegeId,
          created_by: userId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team')
      }

      const team = result.team

      // Send invitations to selected members
      if (selectedMembers.length > 0) {
        const invitationPromises = selectedMembers.map(memberId =>
          fetch('/api/teams/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              team_id: team.id,
              user_id: memberId,
            }),
          })
        )

        await Promise.all(invitationPromises)
      }

      setMessage({ type: 'success', text: 'Team created successfully!' })
      setTimeout(() => router.push('/teams'), 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const toggleMemberSelection = (friendId: string) => {
    setSelectedMembers(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  if (loading) {
    return (
      <main className="rn-shell">
        <div role="status" aria-label="Loading" className="rn-loading">
          <span className="spin">
            <PlusIcon size={20} />
          </span>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Create New Team</h1>

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Team Name */}
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Team Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., AI & Web Dev"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 16,
            }}
          />
        </div>

        {/* Team Members */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            <span style={{ marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }}>
              <UserPlusIcon size={16} />
            </span>
            Invite Team Members (Optional)
          </label>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#6b7280' }}>
            You can only invite users you are connected with
          </p>
          
          {connectedFriends.length === 0 ? (
            <div style={{
              padding: 16,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              backgroundColor: '#f9fafb',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No connected friends available. You can create the team and invite members later.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedFriends.map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ...(selectedMembers.includes(friend.id) && {
                      backgroundColor: '#eff6ff',
                      borderColor: '#3b82f6'
                    })
                  }}
                  onClick={() => toggleMemberSelection(friend.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(friend.id)}
                    onChange={() => {}}
                    style={{ marginRight: 12 }}
                  />
                  <Avatar size={40} />
                  <div style={{ marginLeft: 12, flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{friend.full_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: 1,
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rn-primary-btn"
            style={{
              flex: 1,
              padding: 12,
              opacity: (saving || !name.trim()) ? 0.6 : 1,
              cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 16,
            }}
          >
            {saving ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </main>
  )
}
