import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Avatar from '../../components/Avatar'
import Skeleton from '../../components/Skeleton'
import { supabase } from '../../lib/supabaseClient'

type DirectMessage = {
  id: string
  content: string
  created_at: string
  sender_id: string
  sender_name: string
  sender_avatar?: string | null
}

type OtherUser = {
  id: string
  name: string
  avatar_url?: string | null
  city?: string | null
}

export default function DirectMessagePage() {
  const router = useRouter()
  const { userId } = router.query
  const targetUserId = Array.isArray(userId) ? userId[0] : userId
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState('')
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const loadMessages = async (token: string, target: string) => {
    const response = await fetch(`/api/messages/direct?user_id=${encodeURIComponent(target)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to load messages')
    }
    setOtherUser(result.other_user || null)
    setMessages(result.messages || [])
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/')
        return
      }

      if (!mounted) return
      setSession(session)
    }

    init()
    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    if (!session?.access_token || !targetUserId) return
    let mounted = true
    setLoading(true)
    setError(null)

    const cleanTargetUserId = String(targetUserId)
    if (cleanTargetUserId === session.user.id) {
      setError('You cannot open a direct chat with yourself.')
      setLoading(false)
      return
    }

    const fetchNow = async () => {
      try {
        await loadMessages(session.access_token, cleanTargetUserId)
        if (mounted) setLoading(false)
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load messages')
          setLoading(false)
        }
      }
    }

    fetchNow()
    const interval = setInterval(fetchNow, 4000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [session, targetUserId])

  useEffect(() => {
    if (!scrollerRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.access_token || !targetUserId) return
    const clean = text.trim()
    if (!clean) return

    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/messages/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: String(targetUserId),
          content: clean,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to send message')
      }

      setText('')
      await loadMessages(session.access_token, String(targetUserId))
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const title = useMemo(() => {
    if (!otherUser) return 'Direct Messages'
    return otherUser.name || 'Direct Messages'
  }, [otherUser])

  if (loading) {
    return (
      <main className="rn-profile-view" aria-busy="true" aria-live="polite">
        <section className="rn-profile-card">
          <div className="rn-skeleton-row" style={{ marginBottom: 14 }}>
            <Skeleton className="rn-skeleton-circle" style={{ width: 54, height: 54 }} />
            <div className="rn-skeleton-stack" style={{ width: '44%' }}>
              <Skeleton style={{ width: '80%', height: 18 }} />
              <Skeleton style={{ width: '55%', height: 13 }} />
            </div>
          </div>
          <div className="rn-skeleton-stack">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="rn-skeleton-row" style={{ justifyContent: idx % 2 ? 'flex-end' : 'flex-start' }}>
                <Skeleton style={{ width: idx % 2 ? '58%' : '70%', height: 40, borderRadius: 12 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Skeleton style={{ width: '100%', height: 42 }} />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="rn-profile-view rn-wa-shell">
      <section className="rn-profile-card rn-wa-chat-card">
        <div className="rn-wa-header">
          <Avatar src={otherUser?.avatar_url || undefined} alt={title} size={50} />
          <div className="rn-wa-headtext">
            <h1>{title}</h1>
            <div className="rn-wa-meta">
              <span>{otherUser?.city || 'Direct chat'}</span>
            </div>
          </div>
          <button
            type="button"
            className="rn-secondary-btn rn-wa-profile-btn"
            onClick={() => router.push(otherUser ? `/profiles/${otherUser.id}` : '/explore')}
          >
            View
          </button>
        </div>

        {error && <div className="rn-message error rn-wa-error">{error}</div>}

        <div ref={scrollerRef} className="rn-wa-scroll">
          {messages.length === 0 ? (
            <p className="rn-muted rn-wa-empty">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((message) => {
              const own = message.sender_id === session?.user?.id
              return (
                <div key={message.id} className={`rn-wa-bubble ${own ? 'is-own' : ''}`}>
                  <div className="rn-wa-bubble-text">{message.content}</div>
                  <div className="rn-wa-bubble-meta">
                    {own ? 'You' : message.sender_name} | {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <form onSubmit={handleSend} className="rn-wa-composer">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            maxLength={2000}
            className="rn-wa-input"
          />
          <button type="submit" className="rn-primary-btn rn-wa-send" disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </main>
  )
}
