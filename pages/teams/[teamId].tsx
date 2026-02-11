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
            <svg width="48" height="48" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="teamLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              
              {/* Team icon from SVGRepo - Professional team design */}
              <path d="M824.2 699.9a301.55 301.55 0 0 0-86.4-60.4C783.1 602.8 812 546.8 812 484c0-110.8-92.4-201.7-203.2-200-109.1 1.7-197 90.6-197 200 0 62.8 29 118.8 74.2 155.5a300.95 300.95 0 0 0-86.4 60.4C345 754.6 314 826.8 312 903.8a8 8 0 0 0 8 8.2h56c4.3 0 7.9-3.4 8-7.7 1.9-58 25.4-112.3 66.7-153.5A226.62 226.62 0 0 1 612 684c60.9 0 118.2 23.7 161.3 66.8C814.5 792 838 846.3 840 904.3c.1 4.3 3.7 7.7 8 7.7h56a8 8 0 0 0 8-8.2c-2-77-33-149.2-87.8-203.9zM612 612c-34.2 0-66.4-13.3-90.5-37.5a126.86 126.86 0 0 1-37.5-91.8c.3-32.8 13.4-64.5 36.3-88 24-24.6 56.1-38.3 90.4-38.7 33.9-.3 66.8 12.9 91 36.6 24.8 24.3 38.4 56.8 38.4 91.4 0 34.2-13.3 66.3-37.5 90.5A127.3 127.3 0 0 1 612 612zM361.5 510.4c-.9-8.7-1.4-17.5-1.4-26.4 0-15.9 1.5-31.4 4.3-46.5.7-3.6-1.2-7.3-4.5-8.8-13.6-6.1-26.1-14.5-36.9-25.1a127.54 127.54 0 0 1-38.7-95.4c.9-32.1 13.8-62.6 36.3-85.6 24.7-25.3 57.9-39.1 93.2-38.7 31.9.3 62.7 12.6 86 34.4 7.9 7.4 14.7 15.6 20.4 24.4 2 3.1 5.9 4.4 9.3 3.2 17.6-6.1 36.2-10.4 55.3-12.4 5.6-.6 8.8-6.6 6.3-11.6-32.5-64.3-98.9-108.7-175.7-109.9-110.9-1.7-203.3 89.2-203.3 199.9 0 62.8 28.9 118.8 74.2 155.5-31.8 14.7-61.1 35-86.5 60.4-54.8 54.7-85.8 126.9-87.8 204a8 8 0 0 0 8 8.2h56.1c4.3 0 7.9-3.4 8-7.7 1.9-58 25.4-112.3 66.7-153.5 29.4-29.4 65.4-49.8 104.7-59.7 3.9-1 6.5-4.7 6-8.7z" 
                    fill="url(#teamLogoGradient)" 
                    stroke="url(#teamLogoGradient)" 
                    strokeWidth="2"/>
              
              {/* Team initials overlay */}
              <text x="512" y="512" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="120" fontWeight="bold" fontFamily="Arial, sans-serif">
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
