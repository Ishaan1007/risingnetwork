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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="teamLogoGradientV2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              
              {/* Team logo from team_logo.svg - Correct path data */}
              <path d="M17.5,12 C20.5375661,12 23,14.4624339 23,17.5 C23,20.5375661 20.5375661,23 17.5,23 C14.4624339,23 12,20.5375661 12,17.5 C12,14.4624339 14.4624339,12 17.5,12 Z M17.5,13.9992349 L17.4101244,14.0072906 C17.2060313,14.0443345 17.0450996,14.2052662 17.0080557,14.4093593 L17,14.4992349 L16.9996498,16.9992349 L14.4976498,17 L14.4077742,17.0080557 C14.2036811,17.0450996 14.0427494,17.2060313 14.0057055,17.4101244 L13.9976498,17.5 L14.0057055,17.5898756 C14.0427494,17.7939687 14.2036811,17.9549004 14.4077742,17.9919443 L14.4976498,18 L17.0006498,17.9992349 L17.0011076,20.5034847 L17.0091633,20.5933603 C17.0462073,20.7974534 17.207139,20.9583851 17.411232,20.995429 L17.5011076,21.0034847 L17.5909833,20.995429 C17.7950763,20.9583851 17.956008,20.7974534 17.993052,20.5933603 L18.0011076,20.5034847 L18.0006498,17.9992349 L20.5045655,18 L20.5944411,17.9919443 C20.7985342,17.9549004 20.9594659,17.7939687 20.9965098,17.5898756 L21.0045655,17.5 L20.9965098,17.4101244 C20.9594659,17.2060313 20.7985342,17.0450996 20.5944411,17.0080557 L20.5045655,17 L17.9996498,16.9992349 L18,14.4992349 L17.9919443,14.4093593 C17.9549004,14.2052662 17.7939687,14.0443345 17.5898756,14.0072906 L17.5,13.9992349 Z M14.2540247,10 C15.0885672,10 15.8169906,10.4543496 16.2054276,11.1291814 C15.6719841,11.2368176 15.1631195,11.409593 14.6865144,11.6387884 C14.5648628,11.550964 14.4153954,11.5 14.2540247,11.5 L9.75192738,11.5 C9.33771382,11.5 9.00192738,11.8357864 9.00192738,12.25 L9.00192738,16.4989513 C9.00192738,17.9098632 9.97557657,19.0933671 11.2876273,19.4142154 C11.4604353,19.9797789 11.7097452,20.5127963 12.0225923,21.0012092 L12.002976,21 C9.51711551,21 7.50192738,18.9848119 7.50192738,16.4989513 L7.50192738,12.25 C7.50192738,11.0073593 8.5092867,10 9.75192738,10 L14.2540247,10 Z M7.40645343,10.000271 C7.01177565,10.4116389 6.72426829,10.9266236 6.58881197,11.5003444 L4.25,11.5 C3.83578644,11.5 3.5,11.8357864 3.5,12.25 L3.5,14.99876 C3.5,16.3801567 4.61984327,17.5 6.00123996,17.5 C6.20123055,17.5 6.39573909,17.4765286 6.58216119,17.4321901 C6.66686857,17.9361103 6.82155533,18.416731 7.03486751,18.8640179 C6.70577369,18.9530495 6.35898976,19 6.00123996,19 C3.79141615,19 2,17.2085839 2,14.99876 L2,12.25 C2,11.059136 2.92516159,10.0843551 4.09595119,10.0051908 L4.25,10 L7.40645343,10.000271 Z M19.75,10 C20.9926407,10 22,11.0073593 22,12.25 L22.0008195,12.8103588 C20.8328473,11.6891263 19.2469007,11 17.5,11 L17.2548102,11.004539 L17.2548102,11.004539 C17.1009792,10.6291473 16.8766656,10.2891588 16.5994986,10.000271 L19.75,10 Z M18.5,4 C19.8807119,4 21,5.11928813 21,6.5 C21,7.88071187 19.8807119,9 18.5,9 C17.1192881,9 16,7.88071187 16,6.5 C16,5.11928813 17.1192881,4 18.5,4 Z M12,3 C13.6568542,3 15,4.34314575 15,6 C15,7.65685425 13.6568542,9 12,9 C10.3431458,9 9,7.65685425 9,6 C9,4.34314575 10.3431458,3 12,3 Z M5.5,4 C6.88071187,4 8,5.11928813 8,6.5 C8,7.88071187 6.88071187,9 5.5,9 C4.11928813,9 3,7.88071187 3,6.5 C3,5.11928813 4.11928813,4 5.5,4 Z M18.5,5.5 C17.9477153,5.5 17.5,5.94771525 17.5,6.5 C17.5,7.05228475 17.9477153,7.5 18.5,7.5 C19.0522847,7.5 19.5,7.05228475 19.5,6.5 C19.5,5.94771525 19.0522847,5.5 18.5,5.5 Z M12,4.5 C11.1715729,4.5 10.5,5.17157288 10.5,6 C10.5,6.82842712 11.1715729,7.5 12,7.5 C12.8284271,7.5 13.5,6.82842712 13.5,6 C13.5,5.17157288 12.8284271,4.5 12,4.5 Z M5.5,5.5 C4.94771525,5.5 4.5,5.94771525 4.5,6.5 C4.5,7.05228475 4.94771525,7.5 5.5,7.5 C6.05228475,7.5 6.5,7.05228475 6.5,6.5 C6.5,5.94771525 6.05228475,5.5 5.5,5.5 Z" 
                    fill="url(#teamLogoGradientV2)" />
              
              {/* Team initials overlay */}
              <text x="12" y="12" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">
                {team.name.substring(0, 2).toUpperCase()}
              </text>
            </svg>
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
