import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/Avatar'
import Chat from '../../components/Chat'
import { TeamsIcon } from '../../components/Icons'
import Skeleton from '../../components/Skeleton'

type Team = {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  max_members: number
}

type TeamMember = {
  id: string
  user_id: string
  team_id: string
  status: 'pending' | 'accepted' | 'declined'
  invited_by: string
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url?: string
    email: string
  }
}

type Meeting = {
  id: string
  title: string
  description?: string
  team_id: string
  creator_id: string
  scheduled_for: string
  duration_minutes: number
  meet_link?: string
  created_at: string
}

type InviteCandidate = {
  id: string
  name: string
  avatar_url?: string | null
  email?: string | null
}

export default function TeamDetailPage() {
  const router = useRouter()
  const { teamId } = router.query
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'meetings'>('chat')
  const [isMember, setIsMember] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [inviteCandidates, setInviteCandidates] = useState<InviteCandidate[]>([])
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!teamId) return

    const fetchData = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/explore')
          return
        }
        setCurrentUser(session.user)
        setAccessToken(session.access_token)

        // Fetch team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        if (teamError) {
          console.error('Team fetch error:', teamError)
          router.push('/teams')
          return
        }

        setTeam(teamData)

        // Fetch team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            *,
            profiles!team_members_user_id_fkey (
              id,
              name,
              avatar_url,
              email
            )
          `)
          .eq('team_id', teamId)
          .eq('status', 'accepted')

        if (membersError) {
          console.error('Members fetch error:', membersError)
        } else {
          let acceptedMembers = (membersData || []) as TeamMember[]

          // Auto-heal: ensure team creator always has an accepted membership row.
          if (
            teamData?.created_by === session.user.id &&
            !acceptedMembers.some((member) => member.user_id === session.user.id)
          ) {
            const { error: ensureMemberError } = await (supabase as any)
              .from('team_members')
              .insert({
                team_id: teamId,
                user_id: session.user.id,
                status: 'accepted',
                invited_by: session.user.id,
              })

            if (ensureMemberError && ensureMemberError.code !== '23505') {
              console.error('Ensure creator membership error:', ensureMemberError)
            } else {
              const { data: refreshedMembers, error: refreshMembersError } = await supabase
                .from('team_members')
                .select(`
                  *,
                  profiles!team_members_user_id_fkey (
                    id,
                    name,
                    avatar_url,
                    email
                  )
                `)
                .eq('team_id', teamId)
                .eq('status', 'accepted')

              if (!refreshMembersError && refreshedMembers) {
                acceptedMembers = refreshedMembers as TeamMember[]
              }
            }
          }

          setMembers(acceptedMembers)
          const isUserMember =
            teamData?.created_by === session.user.id ||
            acceptedMembers.some((member) => member.user_id === session.user.id)
          setIsMember(isUserMember)
        }

        // Team creator can invite anyone who is not already on the team list.
        if (teamData?.created_by === session.user.id) {
          const { data: allTeamMemberRows } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId)

          const excludedIds = new Set<string>([
            session.user.id,
            ...(allTeamMemberRows || []).map((row: any) => row.user_id).filter(Boolean),
          ])

          let candidatesQuery = supabase
            .from('profiles')
            .select('id, name, avatar_url, email')
            .order('name', { ascending: true })
            .limit(60)

          if (excludedIds.size > 0) {
            candidatesQuery = candidatesQuery.not('id', 'in', `(${Array.from(excludedIds).join(',')})`)
          }

          const { data: candidateProfiles } = await candidatesQuery
          setInviteCandidates((candidateProfiles || []) as InviteCandidate[])
        }

        // Fetch meetings
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('team_id', teamId)
          .order('scheduled_for', { ascending: true })

        if (meetingsError) {
          console.error('Meetings fetch error:', meetingsError)
        } else {
          setMeetings(meetingsData || [])
        }

      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teamId, router])

  const handleJoinTeam = async () => {
    if (!currentUser || !team) return

    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: currentUser.id,
          status: 'pending',
          invited_by: currentUser.id
        })

      if (error) {
        console.error('Join team error:', error)
        alert('Failed to join team')
      } else {
        alert('Request sent to join team')
      }
    } catch (error) {
      console.error('Join team error:', error)
      alert('Failed to join team')
    }
  }

  const handleInviteMember = async (userId: string) => {
    if (!team || !accessToken) return
    setInvitingUserId(userId)
    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          team_id: team.id,
          user_id: userId,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to invite member')

      setInviteCandidates((prev) => prev.filter((candidate) => candidate.id !== userId))
    } catch (error: any) {
      alert(error.message || 'Failed to invite member')
    } finally {
      setInvitingUserId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!team || !accessToken || !currentUser) return
    if (userId === currentUser.id) return
    setRemovingUserId(userId)
    try {
      const response = await fetch('/api/teams/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'kick-member',
          team_id: team.id,
          user_id: userId,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to remove member')

      const removed = members.find((m) => m.user_id === userId)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
      if (removed?.profiles) {
        setInviteCandidates((prev) => {
          if (prev.some((candidate) => candidate.id === removed.profiles.id)) return prev
          return [
            ...prev,
            {
              id: removed.profiles.id,
              name: removed.profiles.name || 'Unknown',
              avatar_url: removed.profiles.avatar_url,
              email: removed.profiles.email,
            },
          ]
        })
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove member')
    } finally {
      setRemovingUserId(null)
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="rn-shell" aria-busy="true" aria-live="polite">
        <div className="rn-teams-header">
          <div className="rn-team-info">
            <Skeleton style={{ width: 72, height: 72, borderRadius: 18 }} />
            <div className="rn-skeleton-stack" style={{ width: 340 }}>
              <Skeleton style={{ width: '70%', height: 30 }} />
              <Skeleton style={{ width: '100%', height: 16 }} />
            </div>
          </div>
        </div>
        <div className="rn-layout">
          <div className="rn-panel">
            <div className="rn-tabs">
              <Skeleton style={{ width: 80, height: 34 }} />
              <Skeleton style={{ width: 110, height: 34 }} />
              <Skeleton style={{ width: 110, height: 34 }} />
            </div>
            <div className="rn-tab-content rn-skeleton-stack" style={{ marginTop: 14 }}>
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="rn-skeleton-row">
                  <Skeleton className="rn-skeleton-circle" style={{ width: 48, height: 48 }} />
                  <div className="rn-skeleton-stack" style={{ flex: 1 }}>
                    <Skeleton style={{ width: '48%', height: 14 }} />
                    <Skeleton style={{ width: '68%', height: 13 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rn-main-content rn-skeleton-stack">
            <div className="rn-card">
              <Skeleton style={{ width: 170, height: 24, marginBottom: 14 }} />
              <div className="rn-team-stats">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="rn-stat">
                    <Skeleton style={{ width: 72, height: 28, marginBottom: 8 }} />
                    <Skeleton style={{ width: 90, height: 12 }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rn-card">
              <Skeleton style={{ width: 180, height: 22, marginBottom: 10 }} />
              <Skeleton style={{ width: '100%', height: 14 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="rn-shell">
        <div className="rn-empty-card">
          <h3>Team not found</h3>
          <p>The team you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rn-shell">
      <div className="rn-teams-header">
        <div className="rn-team-info">
          <div className="rn-team-logo">
            <TeamsIcon size={48} />
          </div>
          <div className="rn-team-details">
            <h1>{team.name}</h1>
            <p>Team collaboration and networking</p>
          </div>
        </div>
        {!isMember && currentUser && (
          <button
            onClick={handleJoinTeam}
            className="rn-primary-btn"
          >
            Join Team
          </button>
        )}
      </div>

      {isMember ? (
        <div className="rn-layout">
          {/* Sidebar */}
          <div className="rn-panel">
            <div className="rn-tabs">
              <button
                className={`rn-tab ${activeTab === 'chat' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                className={`rn-tab ${activeTab === 'members' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                Members ({members.length})
              </button>
              <button
                className={`rn-tab ${activeTab === 'meetings' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('meetings')}
              >
                Meetings ({meetings.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="rn-tab-content">
              {activeTab === 'chat' && (
                <div className="rn-chat-wrapper">
                  <Chat
                    channelId={team.id}
                    channelType="team"
                    currentUserId={currentUser.id}
                    currentUserName={currentUser.user_metadata?.name || currentUser.user_metadata?.first_name || 'User'}
                    currentUserAvatar={currentUser.user_metadata?.avatar_url}
                    placeholder="Message your team..."
                  />
                </div>
              )}

              {activeTab === 'members' && (
                <div className="rn-members-list">
                  <h3>Team Members</h3>
                  <div className="rn-friends-grid">
                    {members.map((member) => (
                      <div key={member.id} className="rn-friend-card">
                        <Avatar src={member.profiles.avatar_url} alt={member.profiles.name} size={48} />
                        <h4>{member.profiles.name || 'Unknown'}</h4>
                        <p className="rn-muted">{member.profiles.email}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="rn-link-btn"
                            onClick={() => router.push(`/profiles/${member.profiles.id}`)}
                          >
                            View Profile
                          </button>
                          {currentUser?.id === team.created_by && member.user_id !== currentUser?.id && (
                            <button
                              className="rn-secondary-btn"
                              type="button"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={removingUserId === member.user_id}
                            >
                              {removingUserId === member.user_id ? 'Removing...' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentUser?.id === team.created_by && (
                    <div style={{ marginTop: 16 }}>
                      <h4>Invite Members</h4>
                      {inviteCandidates.length === 0 ? (
                        <p className="rn-muted">No users available to invite.</p>
                      ) : (
                        <div className="rn-friends-grid">
                          {inviteCandidates.map((candidate) => (
                            <div key={candidate.id} className="rn-friend-card">
                              <Avatar src={candidate.avatar_url || undefined} alt={candidate.name} size={44} />
                              <h4>{candidate.name || 'Unknown'}</h4>
                              <p className="rn-muted">{candidate.email || 'No email'}</p>
                              <button
                                className="rn-primary-btn"
                                type="button"
                                onClick={() => handleInviteMember(candidate.id)}
                                disabled={invitingUserId === candidate.id}
                              >
                                {invitingUserId === candidate.id ? 'Inviting...' : 'Invite'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'meetings' && (
                <div className="rn-meetings-list">
                  <h3>Team Meetings</h3>
                  {meetings.length === 0 ? (
                    <div className="rn-empty-card">
                      <p>No meetings scheduled yet.</p>
                    </div>
                  ) : (
                    <div className="rn-cards">
                      {meetings.map((meeting) => (
                        <div key={meeting.id} className="rn-card">
                          <h3>{meeting.title}</h3>
                          {meeting.description && <p>{meeting.description}</p>}
                          <div className="rn-card-meta">
                            <span>{formatDateTime(meeting.scheduled_for)}</span>
                            <span>{formatDuration(meeting.duration_minutes)}</span>
                          </div>
                          <div className="rn-card-actions">
                            {meeting.meet_link ? (
                              <a
                                href={meeting.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rn-primary-btn"
                              >
                                Join Meeting
                              </a>
                            ) : (
                              <span className="rn-muted">No meeting link available</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="rn-main-content">
            {/* Team Overview */}
            <div className="rn-card">
              <h2>Team Overview</h2>
              <div className="rn-team-stats">
                <div className="rn-stat">
                  <span className="rn-stat-number">{members.length}</span>
                  <span className="rn-stat-label">Members</span>
                </div>
                <div className="rn-stat">
                  <span className="rn-stat-number">{meetings.length}</span>
                  <span className="rn-stat-label">Meetings</span>
                </div>
                <div className="rn-stat">
                  <span className="rn-stat-number">{team.max_members >= 9999 ? 'Unlimited' : team.max_members}</span>
                  <span className="rn-stat-label">Member Limit</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rn-card">
              <h2>Recent Activity</h2>
              <p className="rn-muted">Team activity will appear here...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rn-empty-card">
          <h3>Join this team to participate</h3>
          <p>You need to be a member of this team to access chat, meetings, and other features.</p>
          <button
            onClick={handleJoinTeam}
            className="rn-primary-btn"
          >
            Request to Join Team
          </button>
        </div>
      )}
    </div>
  )
}
