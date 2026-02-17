import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/Avatar'
import Chat from '../../components/Chat'
import { LoaderIcon } from '../../components/Icons'

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
  teams: {
    id: string
    name: string
  }
}

type MeetingParticipant = {
  id: string
  meeting_id: string
  user_id: string
  status: 'invited' | 'accepted' | 'declined' | 'joined'
  profiles: {
    id: string
    name: string
    avatar_url?: string
    email: string
  }
}

export default function MeetingDetailPage() {
  const router = useRouter()
  const { meetingId } = router.query
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [participants, setParticipants] = useState<MeetingParticipant[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'details'>('chat')
  const [isParticipant, setIsParticipant] = useState(false)
  const [userStatus, setUserStatus] = useState<'invited' | 'accepted' | 'declined' | 'joined'>()

  useEffect(() => {
    if (!meetingId) return

    const fetchData = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/explore')
          return
        }
        setCurrentUser(session.user)

        // Fetch meeting details
        const { data: meetingData, error: meetingError } = await supabase
          .from('meetings')
          .select(`
            *,
            teams (
              id,
              name
            )
          `)
          .eq('id', meetingId)
          .single()

        if (meetingError) {
          console.error('Meeting fetch error:', meetingError)
          router.push('/meetings')
          return
        }

        setMeeting(meetingData)

        // Fetch meeting participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('meeting_participants')
          .select(`
            *,
            profiles (
              id,
              name,
              avatar_url,
              email
            )
          `)
          .eq('meeting_id', meetingId)

        if (participantsError) {
          console.error('Participants fetch error:', participantsError)
        } else {
          setParticipants(participantsData || [])
          
          // Check if current user is a participant
          const userParticipant = participantsData?.find(p => p.user_id === session.user.id)
          setIsParticipant(userParticipant?.status === 'accepted' || userParticipant?.status === 'joined')
          setUserStatus(userParticipant?.status)
        }

      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [meetingId, router])

  const handleJoinMeeting = async () => {
    if (!currentUser || !meeting) return

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .upsert({
          meeting_id: meeting.id,
          user_id: currentUser.id,
          status: 'accepted'
        })

      if (error) {
        console.error('Join meeting error:', error)
        alert('Failed to join meeting')
      } else {
        setIsParticipant(true)
        setUserStatus('accepted')
      }
    } catch (error) {
      console.error('Join meeting error:', error)
      alert('Failed to join meeting')
    }
  }

  const handleStatusChange = async (status: 'accepted' | 'declined' | 'joined') => {
    if (!currentUser || !meeting) return

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .upsert({
          meeting_id: meeting.id,
          user_id: currentUser.id,
          status
        })

      if (error) {
        console.error('Update status error:', error)
        alert('Failed to update status')
      } else {
        setUserStatus(status)
      }
    } catch (error) {
      console.error('Update status error:', error)
      alert('Failed to update status')
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const isMeetingActive = () => {
    if (!meeting) return false
    const now = new Date()
    const meetingTime = new Date(meeting.scheduled_for)
    const endTime = new Date(meetingTime.getTime() + meeting.duration_minutes * 60000)
    return now >= meetingTime && now <= endTime
  }

  const isMeetingUpcoming = () => {
    if (!meeting) return false
    const now = new Date()
    const meetingTime = new Date(meeting.scheduled_for)
    return now < meetingTime
  }

  if (loading) {
    return (
      <div className="rn-shell">
        <div className="rn-loading">
          <LoaderIcon size={24} />
          <span>Loading meeting...</span>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="rn-shell">
        <div className="rn-empty-card">
          <h3>Meeting not found</h3>
          <p>The meeting you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rn-shell">
      <div className="rn-teams-header">
        <div>
          <h1>{meeting.title}</h1>
          <p>{meeting.description || 'No description available'}</p>
          <div className="rn-card-meta">
            <span>{formatDateTime(meeting.scheduled_for)}</span>
            <span>{formatDuration(meeting.duration_minutes)}</span>
            <span>Team: {meeting.teams.name}</span>
          </div>
        </div>
        <div className="rn-meeting-actions">
          {isMeetingActive() && meeting.meet_link && (
            <a
              href={meeting.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rn-primary-btn"
            >
              Join Meeting Now
            </a>
          )}
          
          {isParticipant ? (
            <div className="rn-status-buttons">
              <button
                className={`rn-status-btn ${userStatus === 'accepted' ? 'active' : ''}`}
                onClick={() => handleStatusChange('accepted')}
              >
                Going
              </button>
              <button
                className={`rn-status-btn ${userStatus === 'declined' ? 'active' : ''}`}
                onClick={() => handleStatusChange('declined')}
              >
                Not Going
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoinMeeting}
              className="rn-primary-btn"
            >
              Join Meeting
            </button>
          )}
        </div>
      </div>

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
              className={`rn-tab ${activeTab === 'participants' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants ({participants.length})
            </button>
            <button
              className={`rn-tab ${activeTab === 'details' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>

          {/* Tab Content */}
          <div className="rn-tab-content">
            {activeTab === 'chat' && isParticipant && (
              <div className="rn-chat-wrapper">
                <Chat
                  channelId={meeting.id}
                  channelType="meeting"
                  currentUserId={currentUser.id}
                  currentUserName={currentUser.user_metadata?.name || currentUser.user_metadata?.first_name || 'User'}
                  currentUserAvatar={currentUser.user_metadata?.avatar_url}
                  placeholder="Message meeting participants..."
                />
              </div>
            )}

            {activeTab === 'chat' && !isParticipant && (
              <div className="rn-empty-card">
                <h3>Join meeting to participate in chat</h3>
                <p>You need to join this meeting to access the chat.</p>
                <button
                  onClick={handleJoinMeeting}
                  className="rn-primary-btn"
                >
                  Join Meeting
                </button>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="rn-members-list">
                <h3>Meeting Participants</h3>
                <div className="rn-friends-grid">
                  {participants.map((participant) => (
                    <div key={participant.id} className="rn-friend-card">
                      <Avatar src={participant.profiles.avatar_url} alt={participant.profiles.name} size={48} />
                      <h4>{participant.profiles.name || 'Unknown'}</h4>
                      <span className={`rn-badge ${participant.status}`}>
                        {participant.status}
                      </span>
                      <button
                        className="rn-link-btn"
                        onClick={() => router.push(`/profiles/${participant.profiles.id}`)}
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="rn-meeting-details">
                <h3>Meeting Details</h3>
                <div className="rn-detail-item">
                  <label>Title:</label>
                  <span>{meeting.title}</span>
                </div>
                {meeting.description && (
                  <div className="rn-detail-item">
                    <label>Description:</label>
                    <span>{meeting.description}</span>
                  </div>
                )}
                <div className="rn-detail-item">
                  <label>Date & Time:</label>
                  <span>{formatDateTime(meeting.scheduled_for)}</span>
                </div>
                <div className="rn-detail-item">
                  <label>Duration:</label>
                    <span>{formatDuration(meeting.duration_minutes)}</span>
                </div>
                <div className="rn-detail-item">
                  <label>Team:</label>
                  <span>{meeting.teams.name}</span>
                </div>
                {meeting.meet_link && (
                  <div className="rn-detail-item">
                    <label>Meeting Link:</label>
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rn-link-btn"
                    >
                      Join Google Meet
                    </a>
                  </div>
                )}
                
                <div className="rn-meeting-status">
                  <h4>Meeting Status</h4>
                  {isMeetingActive() && (
                    <div className="rn-status-active">
                      <span className="rn-status-indicator online"></span>
                      <span>Meeting is in progress</span>
                    </div>
                  )}
                  {isMeetingUpcoming() && (
                    <div className="rn-status-upcoming">
                      <span className="rn-status-indicator"></span>
                      <span>Meeting is upcoming</span>
                    </div>
                  )}
                  {!isMeetingActive() && !isMeetingUpcoming() && (
                    <div className="rn-status-ended">
                      <span className="rn-status-indicator offline"></span>
                      <span>Meeting has ended</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="rn-main-content">
          {/* Meeting Overview */}
          <div className="rn-card">
            <h2>Meeting Overview</h2>
            <div className="rn-team-stats">
              <div className="rn-stat">
                <span className="rn-stat-number">{participants.length}</span>
                <span className="rn-stat-label">Participants</span>
              </div>
              <div className="rn-stat">
                <span className="rn-stat-number">{meeting.duration_minutes}</span>
                <span className="rn-stat-label">Minutes</span>
              </div>
              <div className="rn-stat">
                <span className="rn-stat-number">{meeting.teams.name}</span>
                <span className="rn-stat-label">Team</span>
              </div>
            </div>
          </div>

          {/* Meeting Actions */}
          {isMeetingActive() && meeting.meet_link && (
            <div className="rn-card">
              <h2>Join Meeting</h2>
              <p>The meeting is currently in progress. Click below to join.</p>
              <a
                href={meeting.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="rn-primary-btn"
                style={{ marginTop: '12px' }}
              >
                Join Google Meet
              </a>
            </div>
          )}

          {/* Meeting Notes */}
          <div className="rn-card">
            <h2>Meeting Notes</h2>
            <p className="rn-muted">Meeting notes and agenda will appear here...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
