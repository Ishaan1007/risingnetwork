import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Avatar from '../../components/Avatar'
import Skeleton from '../../components/Skeleton'
import { supabase } from '../../lib/supabaseClient'

type Connection = {
  id: string
  requester_id: string
  recipient_id: string
  status: 'pending' | 'accepted' | 'rejected'
}

type Profile = {
  id: string
  name: string
  avatar_url?: string | null
  city?: string | null
  role?: string | null
}

type LastMessageSummary = {
  createdAt: string | null
  content: string | null
  senderId: string | null
}

export default function MessagesHome() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [incoming, setIncoming] = useState<Connection[]>([])
  const [accepted, setAccepted] = useState<Connection[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [lastMessageByUser, setLastMessageByUser] = useState<Record<string, LastMessageSummary>>({})
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
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
        setError('Failed to load conversations.')
        setLoading(false)
        return
      }

      const rows = (data || []) as Connection[]
      const incomingRows = rows.filter(
        (c) => c.status === 'pending' && c.recipient_id === session.user.id
      )
      const acceptedRows = rows.filter((c) => c.status === 'accepted')
      setIncoming(incomingRows)
      setAccepted(acceptedRows)

      const acceptedOtherIds = acceptedRows.map((c) =>
        c.requester_id === session.user.id ? c.recipient_id : c.requester_id
      )
      const incomingRequesterIds = incomingRows.map((c) => c.requester_id)
      const ids = Array.from(
        new Set([...acceptedOtherIds, ...incomingRequesterIds])
      )

      if (ids.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, city, role')
          .in('id', ids)

        const map: Record<string, Profile> = {}
        ;(profileData || []).forEach((p: any) => {
          map[p.id] = p
        })
        setProfiles(map)
      } else {
        setProfiles({})
      }

      if (acceptedOtherIds.length > 0) {
        const acceptedSet = new Set(acceptedOtherIds)
        const { data: directConversations } = await supabase
          .from('conversations')
          .select('id, direct_user_a, direct_user_b')
          .eq('type', 'direct')
          .or(`direct_user_a.eq.${session.user.id},direct_user_b.eq.${session.user.id}`)

        const conversationToUser = new Map<string, string>()
        ;(directConversations || []).forEach((conversation: any) => {
          const otherUserId =
            conversation.direct_user_a === session.user.id
              ? conversation.direct_user_b
              : conversation.direct_user_a
          if (otherUserId && acceptedSet.has(otherUserId)) {
            conversationToUser.set(conversation.id, otherUserId)
          }
        })

        const conversationIds = Array.from(conversationToUser.keys())
        const latestByUser: Record<string, LastMessageSummary> = {}
        acceptedOtherIds.forEach((id) => {
          latestByUser[id] = {
            createdAt: null,
            content: null,
            senderId: null,
          }
        })

        if (conversationIds.length > 0) {
          const { data: messageRows } = await supabase
            .from('messages')
            .select('conversation_id, created_at, content, sender_id')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })

          ;(messageRows || []).forEach((message: any) => {
            const otherUserId = conversationToUser.get(message.conversation_id)
            if (!otherUserId) return
            if (!latestByUser[otherUserId]?.createdAt) {
              latestByUser[otherUserId] = {
                createdAt: message.created_at || null,
                content: message.content || null,
                senderId: message.sender_id || null,
              }
            }
          })
        }

        setLastMessageByUser(latestByUser)
      } else {
        setLastMessageByUser({})
      }

      setLoading(false)
    }

    load()
  }, [session])

  const incomingCards = useMemo(() => {
    return incoming.map((c) => {
      const profile = profiles[c.requester_id]
      const role = profile?.role ? `${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)}` : 'Professional'
      const meta = [role, profile?.city].filter(Boolean).join(' | ')
      return {
        id: c.id,
        requesterId: c.requester_id,
        name: profile?.name || 'Unknown user',
        avatar: profile?.avatar_url,
        meta,
      }
    })
  }, [incoming, profiles])

  const chatCards = useMemo(() => {
    const cards = accepted.map((c) => {
      const otherId = c.requester_id === session?.user?.id ? c.recipient_id : c.requester_id
      const profile = profiles[otherId]
      const role = profile?.role ? `${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)}` : 'Professional'
      const meta = [role, profile?.city].filter(Boolean).join(' | ')
      const lastMessage = lastMessageByUser[otherId] || {
        createdAt: null,
        content: null,
        senderId: null,
      }
      return {
        id: c.id,
        otherId,
        name: profile?.name || 'Unknown user',
        avatar: profile?.avatar_url,
        meta,
        hasMessages: Boolean(lastMessage.createdAt),
        lastMessage,
      }
    })

    cards.sort((a, b) => {
      if (a.hasMessages !== b.hasMessages) {
        return a.hasMessages ? -1 : 1
      }
      if (a.lastMessage.createdAt && b.lastMessage.createdAt) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      }
      return a.name.localeCompare(b.name)
    })

    return cards
  }, [accepted, profiles, session, lastMessageByUser])

  const handleRequestUpdate = async (connectionId: string, status: 'accepted' | 'rejected') => {
    if (!session?.user) return
    const record = incoming.find((c) => c.id === connectionId)
    if (!record) return

    setUpdatingRequestId(connectionId)
    setError(null)
    const updates: Record<string, any> = { status }

    const { error: updateError } = await supabase
      .from('connections')
      .update(updates)
      .eq('id', connectionId)

    if (updateError) {
      setError(`Failed to ${status === 'accepted' ? 'accept' : 'decline'} request.`)
      setUpdatingRequestId(null)
      return
    }

    setIncoming((prev) => prev.filter((c) => c.id !== connectionId))
    if (status === 'accepted') {
      setAccepted((prev) => [...prev, { ...record, status: 'accepted' }])
      setLastMessageByUser((prev) => ({
        ...prev,
        [record.requester_id]:
          prev[record.requester_id] || {
            createdAt: null,
            content: null,
            senderId: null,
          },
      }))
    }
    setUpdatingRequestId(null)
  }

  const formatMessageTime = (isoTime: string | null) => {
    if (!isoTime) return ''
    const messageDate = new Date(isoTime)
    const now = new Date()
    const sameDay = messageDate.toDateString() === now.toDateString()
    if (sameDay) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <main className="rn-shell rn-connections-shell rn-messages-shell" aria-busy="true" aria-live="polite">
        <div className="rn-results-header rn-connections-header">
          <div className="rn-skeleton-stack" style={{ width: 280 }}>
            <Skeleton style={{ height: 32, width: '70%' }} />
            <Skeleton style={{ height: 16, width: '100%' }} />
          </div>
        </div>
        <section className="rn-profile-card rn-messages-panel">
          <div className="rn-messages-list">
            {[0, 1, 2].map((card) => (
              <div key={card} className="rn-msg-item">
                <div className="rn-msg-head">
                  <Skeleton className="rn-skeleton-circle" style={{ width: 56, height: 56 }} />
                  <div className="rn-skeleton-stack" style={{ flex: 1 }}>
                    <Skeleton style={{ height: 15, width: '45%' }} />
                    <Skeleton style={{ height: 12, width: '65%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="rn-shell rn-connections-shell rn-messages-shell">
      <div className="rn-results-header rn-connections-header">
        <div>
          <h1>Messages</h1>
          <p>Start a direct chat with your accepted connections.</p>
        </div>
      </div>

      {error && <div className="rn-message error">{error}</div>}

      <section className="rn-profile-card rn-messages-panel">
        <h2>Requests</h2>
        {incomingCards.length === 0 ? (
          <p className="rn-muted">No incoming requests.</p>
        ) : (
          <div className="rn-messages-list">
            {incomingCards.map((card) => (
              <div key={card.id} className="rn-msg-item rn-msg-request-item">
                <div className="rn-msg-head">
                  <Avatar src={card.avatar} size={56} />
                  <div className="rn-msg-body">
                    <div className="rn-msg-topline">
                      <strong>{card.name}</strong>
                    </div>
                    <span className="rn-muted">{card.meta || 'Connection request'}</span>
                  </div>
                </div>
                <div className="rn-connection-actions rn-msg-request-actions">
                  <button
                    className="rn-primary-btn rn-msg-action-accept"
                    type="button"
                    disabled={updatingRequestId === card.id}
                    onClick={() => handleRequestUpdate(card.id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="rn-secondary-btn rn-msg-action-decline"
                    type="button"
                    disabled={updatingRequestId === card.id}
                    onClick={() => handleRequestUpdate(card.id, 'rejected')}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rn-profile-card rn-messages-panel">
        <h2>Your Chats</h2>
        {chatCards.length === 0 ? (
          <p className="rn-muted">No accepted connections yet. Accept requests in Connections to start messaging.</p>
        ) : (
          <div className="rn-messages-list">
            {chatCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className="rn-msg-item rn-msg-row-btn"
                onClick={() => router.push(`/messages/${card.otherId}`)}
              >
                <div className="rn-msg-head">
                  <Avatar src={card.avatar} size={56} />
                  <div className="rn-msg-body">
                    <div className="rn-msg-topline">
                      <strong>{card.name}</strong>
                      <span className="rn-msg-time">{formatMessageTime(card.lastMessage.createdAt)}</span>
                    </div>
                    <span className="rn-muted rn-msg-meta">{card.meta || 'Connection'}</span>
                    {card.hasMessages ? (
                      <div className="rn-msg-preview">
                        <span className={card.lastMessage.senderId === session?.user?.id ? 'rn-msg-tick' : undefined}>
                          {card.lastMessage.senderId === session?.user?.id ? 'You: ' : ''}
                          {card.lastMessage.content || 'Sent a message'}
                        </span>
                      </div>
                    ) : (
                      <div className="rn-muted rn-msg-preview">
                        No messages yet
                      </div>
                    )}
                  </div>
                </div>
                <span className="rn-msg-chevron" aria-hidden="true">{'>'}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
