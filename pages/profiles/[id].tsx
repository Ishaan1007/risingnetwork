import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/Avatar'
import Skeleton from '../../components/Skeleton'

type Skill = {
  id: number
  name: string
  category?: string
}

type Profile = {
  id: string
  name: string
  role: string | null
  city: string | null
  bio: string | null
  avatar_url?: string | null
  email?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  portfolio_url?: string | null
}

export default function PublicProfile() {
  const router = useRouter()
  const { id } = router.query
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected' | 'received'>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          name,
          role,
          city,
          bio,
          avatar_url,
          email,
          linkedin_url,
          github_url,
          portfolio_url,
          user_skills (
            skills (
              id,
              name,
              category
            )
          )
        `
        )
        .eq('id', id)
        .single()

      if (!error && data) {
        setProfile(data as Profile)
        const skillList = (data.user_skills || []).map((us: any) => us.skills).filter(Boolean)
        setSkills(skillList)
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    load()
  }, [id])

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user || !profile?.id) {
      setConnectionStatus('none')
      return
    }

    const checkConnection = async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status')
        .or(
          `and(requester_id.eq.${session.user.id},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${session.user.id})`
        )
        .limit(1)

      if (error || !data || data.length === 0) {
        setConnectionStatus('none')
        setConnectionId(null)
        return
      }

      const conn = data[0]
      setConnectionId(conn.id)
      if (conn.status === 'accepted') {
        setConnectionStatus('connected')
      } else if (conn.status === 'pending' && conn.requester_id === session.user.id) {
        setConnectionStatus('pending')
      } else if (conn.status === 'pending') {
        setConnectionStatus('received')
      } else {
        setConnectionStatus('none')
      }
    }

    checkConnection()
  }, [session, profile])

  const handleConnect = async () => {
    if (!session?.user || !profile?.id) {
      alert('Please log in to connect.')
      return
    }

    setConnectLoading(true)
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: session.user.id,
        recipient_id: profile.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (!error) {
      setConnectionStatus('pending')
      setConnectionId(data?.id || null)
    }

    setConnectLoading(false)
  }

  const handleAccept = async () => {
    if (!connectionId) return
    setConnectLoading(true)
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
    if (!error) {
      setConnectionStatus('connected')
    }
    setConnectLoading(false)
  }

  const handleDecline = async () => {
    if (!connectionId) return
    setConnectLoading(true)
    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId)
    if (!error) {
      setConnectionStatus('none')
      setConnectionId(null)
    }
    setConnectLoading(false)
  }

  if (loading) {
    return (
      <main className="rn-profile-view" aria-busy="true" aria-live="polite">
        <section className="rn-profile-hero">
          <Skeleton style={{ height: 150, borderRadius: 20 }} />
          <div className="rn-profile-card rn-profile-main">
            <div className="rn-profile-header">
              <Skeleton className="rn-skeleton-circle" style={{ width: 96, height: 96 }} />
              <div className="rn-skeleton-stack" style={{ flex: 1 }}>
                <Skeleton style={{ width: '38%', height: 30 }} />
                <Skeleton style={{ width: '52%', height: 16 }} />
                <div className="rn-skeleton-row">
                  <Skeleton style={{ width: 110, height: 36 }} />
                  <Skeleton style={{ width: 110, height: 36 }} />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="rn-profile-card rn-profile-section">
          <Skeleton style={{ width: 88, height: 22, marginBottom: 14 }} />
          <Skeleton style={{ width: '100%', height: 14 }} />
          <Skeleton style={{ width: '92%', height: 14 }} />
          <Skeleton style={{ width: '78%', height: 14 }} />
        </section>
        <section className="rn-profile-card rn-profile-section">
          <Skeleton style={{ width: 68, height: 22, marginBottom: 14 }} />
          <div className="rn-tags rn-tags-lg">
            {[0, 1, 2, 3].map((chip) => (
              <Skeleton key={chip} style={{ width: 92, height: 32, borderRadius: 999 }} />
            ))}
          </div>
        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="rn-shell">
        <div className="rn-empty">
          <p>Profile not found.</p>
          <button onClick={() => router.push('/explore')} className="rn-primary-btn" style={{ marginTop: 12 }}>
            Back to Explore
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="rn-profile-view">
      <section className="rn-profile-hero">
        <div className="rn-profile-banner" />
        <div className="rn-profile-card rn-profile-main">
          <div className="rn-profile-header">
            <Avatar src={profile.avatar_url} alt="avatar" size={96} />
            <div className="rn-profile-headtext">
              <h1>
                {profile.name || 'Unknown'}
              </h1>
              <div className="rn-profile-meta">
                <span>{profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Professional'}</span>
                <span>{profile.city || 'Remote'}</span>
              </div>
              {session?.user?.id !== profile.id && (
                <div className="rn-profile-actions">
                  <button
                    className="rn-secondary-btn"
                    type="button"
                    onClick={() => {
                      if (!session?.user) {
                        alert('Please log in to message users.')
                        return
                      }
                      router.push(`/messages/${profile.id}`)
                    }}
                  >
                    Message
                  </button>
                  {connectionStatus === 'received' ? (
                    <>
                      <button
                        className="rn-primary-btn"
                        type="button"
                        onClick={handleAccept}
                        disabled={connectLoading}
                      >
                        Accept
                      </button>
                      <button
                        className="rn-secondary-btn"
                        type="button"
                        onClick={handleDecline}
                        disabled={connectLoading}
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      className="rn-connect-btn"
                      type="button"
                      onClick={handleConnect}
                      disabled={connectLoading || connectionStatus === 'pending' || connectionStatus === 'connected'}
                    >
                      {connectionStatus === 'connected'
                        ? 'Connected'
                        : connectionStatus === 'pending'
                        ? 'Request Sent'
                        : connectLoading
                        ? 'Sending...'
                        : 'Connect'}
                    </button>
                  )}
                  {profile.email && (
                    <button
                      className="rn-secondary-btn"
                      type="button"
                      onClick={() => window.open(`mailto:${profile.email}`)}
                    >
                      Contact
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {profile.bio && (
        <section className="rn-profile-card rn-profile-section">
          <h2>About</h2>
          <p>{profile.bio}</p>
        </section>
      )}

      <section className="rn-profile-card rn-profile-section">
        <h2>Skills</h2>
        {skills.length === 0 ? (
          <p className="rn-muted">No skills listed yet.</p>
        ) : (
          <div className="rn-tags rn-tags-lg">
            {skills.map((skill) => (
              <span key={skill.id}>{skill.name}</span>
            ))}
          </div>
        )}
      </section>

      <section className="rn-profile-card rn-profile-section">
        <h2>External Links</h2>
        <div className="rn-link-list">
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="rn-link-item">
              <div>
                <strong>LinkedIn</strong>
                <span>View LinkedIn profile</span>
              </div>
              <span className="rn-link-arrow">↗</span>
            </a>
          )}
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noreferrer" className="rn-link-item">
              <div>
                <strong>GitHub</strong>
                <span>View GitHub profile</span>
              </div>
              <span className="rn-link-arrow">↗</span>
            </a>
          )}
          {profile.portfolio_url && (
            <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="rn-link-item">
              <div>
                <strong>Portfolio</strong>
                <span>View personal website</span>
              </div>
              <span className="rn-link-arrow">↗</span>
            </a>
          )}
          {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && (
            <p className="rn-muted">No external links added.</p>
          )}
        </div>
      </section>
    </main>
  )
}
