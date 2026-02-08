import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { LoaderIcon } from '../components/Icons'

type Connection = {
  id: string
  requester_id: string
  recipient_id: string
  status: 'pending' | 'accepted' | 'rejected'
}

type Profile = {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  city?: string | null
  role?: string | null
}

export default function Connections() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [incoming, setIncoming] = useState<Connection[]>([])
  const [outgoing, setOutgoing] = useState<Connection[]>([])
  const [accepted, setAccepted] = useState<Connection[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/explore')
        return
      }
      setSession(session)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (!sess?.user) router.push('/explore')
    })

    return () => subscription?.unsubscribe()
  }, [router])

  useEffect(() => {
    if (!session?.user) return

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)

      if (error) {
        setError('Failed to load connections')
        setLoading(false)
        return
      }

      const all = (data || []) as Connection[]
      setIncoming(all.filter((c) => c.recipient_id === session.user.id && c.status === 'pending'))
      setOutgoing(all.filter((c) => c.requester_id === session.user.id && c.status === 'pending'))
      setAccepted(all.filter((c) => c.status === 'accepted'))

      const ids = Array.from(
        new Set(
          all.flatMap((c) =>
            [c.requester_id, c.recipient_id].filter((id) => id !== session.user.id)
          )
        )
      )

      if (ids.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, city, role')
          .in('id', ids)

        const map: Record<string, Profile> = {}
        ;(profileData || []).forEach((p: any) => {
          map[p.id] = p
        })
        setProfiles(map)
      }

      setLoading(false)
    }

    load()
  }, [session])

  const handleUpdate = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('connections').update({ status }).eq('id', id)
    setIncoming((prev) => prev.filter((c) => c.id !== id))
    if (status === 'accepted') {
      const conn = incoming.find((c) => c.id === id)
      if (conn) setAccepted((prev) => [...prev, { ...conn, status: 'accepted' }])
    }
  }

  const renderProfile = (id: string) => {
    const p = profiles[id]
    if (!p) return { name: 'Unknown', meta: '' }
    const role = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Professional'
    const meta = [role, p.city].filter(Boolean).join(' • ')
    return { name: `${p.first_name} ${p.last_name}`.trim(), meta }
  }

  const incomingCards = useMemo(
    () =>
      incoming.map((c) => {
        const otherId = c.requester_id
        const { name, meta } = renderProfile(otherId)
        return { ...c, name, meta, otherId }
      }),
    [incoming, profiles]
  )

  const outgoingCards = useMemo(
    () =>
      outgoing.map((c) => {
        const otherId = c.recipient_id
        const { name, meta } = renderProfile(otherId)
        return { ...c, name, meta, otherId }
      }),
    [outgoing, profiles]
  )

  const acceptedCards = useMemo(
    () =>
      accepted.map((c) => {
        const otherId = c.requester_id === session?.user?.id ? c.recipient_id : c.requester_id
        const { name, meta } = renderProfile(otherId)
        return { ...c, name, meta, otherId }
      }),
    [accepted, profiles, session]
  )

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
    <main className="rn-shell">
      <div className="rn-results-header">
        <div>
          <h1>Connections</h1>
          <p>Manage your requests and connections</p>
        </div>
      </div>

      {error && <div className="rn-message error">{error}</div>}

      <section className="rn-profile-card">
        <h2>Incoming Requests</h2>
        {incomingCards.length === 0 ? (
          <p className="rn-muted">No incoming requests.</p>
        ) : (
          <div className="rn-connection-grid">
            {incomingCards.map((c) => (
              <div key={c.id} className="rn-connection-card">
                <div className="rn-connection-head">
                  <Avatar src={profiles[c.otherId]?.avatar_url} size={56} />
                  <div>
                    <strong>{c.name}</strong>
                    <span className="rn-muted">{c.meta}</span>
                  </div>
                </div>
                <div className="rn-connection-actions">
                  <button className="rn-primary-btn" onClick={() => handleUpdate(c.id, 'accepted')} type="button">
                    Accept
                  </button>
                  <button className="rn-secondary-btn" onClick={() => handleUpdate(c.id, 'rejected')} type="button">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rn-profile-card">
        <h2>Sent Requests</h2>
        {outgoingCards.length === 0 ? (
          <p className="rn-muted">No pending requests.</p>
        ) : (
          <div className="rn-connection-grid">
            {outgoingCards.map((c) => (
              <div key={c.id} className="rn-connection-card">
                <div className="rn-connection-head">
                  <Avatar src={profiles[c.otherId]?.avatar_url} size={56} />
                  <div>
                    <strong>{c.name}</strong>
                    <span className="rn-muted">{c.meta}</span>
                  </div>
                </div>
                <span className="rn-muted">Pending</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rn-profile-card">
        <h2>Connected</h2>
        {acceptedCards.length === 0 ? (
          <p className="rn-muted">No connections yet.</p>
        ) : (
          <div className="rn-connection-grid">
            {acceptedCards.map((c) => (
              <div key={c.id} className="rn-connection-card">
                <div className="rn-connection-head">
                  <Avatar src={profiles[c.otherId]?.avatar_url} size={56} />
                  <div>
                    <strong>{c.name}</strong>
                    <span className="rn-muted">{c.meta}</span>
                  </div>
                </div>
                <button className="rn-link-btn" type="button" onClick={() => router.push(`/profiles/${c.otherId}`)}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
