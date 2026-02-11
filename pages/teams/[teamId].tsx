import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/Avatar'
import Chat from '../../components/Chat'
import { LoaderIcon } from '../../components/Icons'

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
    first_name: string
    last_name?: string
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
  scheduled_time: string
  duration: number
  meet_link?: string
  created_at: string
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
            profiles (
              id,
              first_name,
              last_name,
              avatar_url,
              email
            )
          `)
          .eq('team_id', teamId)
          .eq('status', 'accepted')

        if (membersError) {
          console.error('Members fetch error:', membersError)
        } else {
          setMembers(membersData || [])
          
          // Check if current user is a member
          const isUserMember = membersData?.some(m => m.user_id === session.user.id)
          setIsMember(isUserMember)
        }

        // Fetch meetings
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('team_id', teamId)
          .order('scheduled_time', { ascending: true })

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
      <div className="rn-shell">
        <div className="rn-loading">
          <LoaderIcon size={24} />
          <span>Loading team...</span>
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
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="teamLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              
              {/* Team circle background */}
              <circle cx="24" cy="24" r="22" fill="url(#teamLogoGradient)" opacity="0.1" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#teamLogoGradient)" strokeWidth="2" />
              
              {/* Team icon - network nodes */}
              <circle cx="18" cy="18" r="2.5" fill="url(#teamLogoGradient)" />
              <circle cx="30" cy="18" r="2.5" fill="url(#teamLogoGradient)" />
              <circle cx="24" cy="30" r="2.5" fill="url(#teamLogoGradient)" />
              <circle cx="18" cy="30" r="2" fill="url(#teamLogoGradient)" />
              <circle cx="30" cy="30" r="2" fill="url(#teamLogoGradient)" />
              
              {/* Connection lines */}
              <line x1="18" y1="18" x2="24" y2="24" stroke="url(#teamLogoGradient)" strokeWidth="1.5" />
              <line x1="30" y1="18" x2="24" y2="24" stroke="url(#teamLogoGradient)" strokeWidth="1.5" />
              <line x1="24" y1="24" x2="18" y2="30" stroke="url(#teamLogoGradient)" strokeWidth="1.5" />
              <line x1="24" y1="24" x2="30" y2="30" stroke="url(#teamLogoGradient)" strokeWidth="1.5" />
              <line x1="18" y1="30" x2="30" y2="30" stroke="url(#teamLogoGradient)" strokeWidth="1" />
              
              {/* Team initials */}
              <text x="24" y="24" textAnchor="middle" dominantBaseline="middle" fill="url(#teamLogoGradient)" fontSize="12" fontWeight="bold">
                {team.name.substring(0, 2).toUpperCase()}
              </text>
            </svg>
          </div>
          <div className="rn-team-details">
            <h1>{team.name}</h1>
            <p>{team.description || 'No description available'}</p>
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
                    currentUserName={currentUser.user_metadata?.first_name || 'User'}
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
                        <Avatar src={member.profiles.avatar_url} alt={member.profiles.first_name} size={48} />
                        <h4>{member.profiles.first_name} {member.profiles.last_name || ''}</h4>
                        <p className="rn-muted">{member.profiles.email}</p>
                        <button
                          className="rn-link-btn"
                          onClick={() => router.push(`/profiles/${member.profiles.id}`)}
                        >
                          View Profile
                        </button>
                      </div>
                    ))}
                  </div>
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
                            <span>{formatDateTime(meeting.scheduled_time)}</span>
                            <span>{formatDuration(meeting.duration)}</span>
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
                  <span className="rn-stat-number">{team.max_members}</span>
                  <span className="rn-stat-label">Max Members</span>
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
