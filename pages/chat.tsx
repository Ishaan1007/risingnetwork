import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { LoaderIcon, SearchIcon } from '../components/Icons'
import { getSocket } from '../lib/socketClient'

type ProfileMini = {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  city?: string | null
}

type ChatTarget = {
  id: string
  type: 'direct' | 'team'
  name: string
  subtitle?: string
  otherUserId?: string
  teamId?: string | number
}

type Message = {
  id: string
  sender_id: string | null
  content: string | null
  type: 'text' | 'poll'
  poll_id: string | null
  created_at: string
  conversation_id?: string
}

type PollOption = {
  id: string
  option_text: string
  votes: number
}

type Poll = {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  userVoteOptionId?: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState<ChatTarget[]>([])
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [polls, setPolls] = useState<Record<string, Poll>>({})
  const [text, setText] = useState('')
  const [pollOpen, setPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [chatError, setChatError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [resolvingConversation, setResolvingConversation] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({})
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const pollsRef = useRef<Record<string, Poll>>({})
  const socketRef = useRef<any>(null)

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
      if (!sess?.user) {
        router.push('/explore')
        return
      }
      setSession(sess)
    })

    return () => subscription?.unsubscribe()
  }, [router])

  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return
    let active = true
    const connect = async () => {
      const socket = await getSocket()
      if (!active) return
      socketRef.current = socket
      socket.emit('user:join', { userId: session.user.id })
    }
    connect()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    const loadTargets = async () => {
      setLoading(true)

      const { data: connectionRows } = await supabase
        .from('connections')
        .select('requester_id, recipient_id, status')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)

      const connectionIds = Array.from(
        new Set(
          (connectionRows || []).flatMap((c: any) =>
            [c.requester_id, c.recipient_id].filter((id: string) => id !== session.user.id)
          )
        )
      )

      let profileMap: Record<string, ProfileMini> = {}
      if (connectionIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, city')
          .in('id', connectionIds)
        ;(profileData || []).forEach((p: any) => {
          profileMap[p.id] = p
        })
      }

      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, status, teams (id, name, description)')
        .eq('user_id', session.user.id)
        .eq('status', 'accepted')

      const directTargets: ChatTarget[] = connectionIds.map((id) => {
        const p = profileMap[id]
        const name = p ? `${p.first_name} ${p.last_name}`.trim() : 'Connected User'
        return {
          id: `direct-${id}`,
          type: 'direct',
          name,
          subtitle: p?.city || 'Connected',
          otherUserId: id,
        }
      })

      const teamTargets: ChatTarget[] = (teamMemberships || []).map((m: any) => ({
        id: `team-${m.team_id}`,
        type: 'team',
        name: m.teams?.name || 'Team Chat',
        subtitle: m.teams?.description || 'Team conversation',
        teamId: m.team_id,
      }))

      const merged = [...directTargets, ...teamTargets]
      setTargets(merged)
      setProfiles(profileMap)
      if (merged.length > 0 && !activeTargetId) {
        setActiveTargetId(merged[0].id)
      }
      setLoading(false)
    }

    loadTargets()
  }, [session])

  const activeTarget = useMemo(
    () => targets.find((t) => t.id === activeTargetId) || null,
    [targets, activeTargetId]
  )

  const resolveConversationId = useCallback(async () => {
    if (!session?.user || !activeTarget) return null
    setResolvingConversation(true)
    setChatError(null)

    try {
      if (activeTarget.type === 'direct' && activeTarget.otherUserId) {
        const ids = [session.user.id, activeTarget.otherUserId].sort()
        const { data: existing, error: existingError } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'direct')
          .eq('direct_user_a', ids[0])
          .eq('direct_user_b', ids[1])
          .maybeSingle()

        if (existingError) {
          console.error('load direct conversation error', existingError)
          setChatError(existingError.message || 'Failed to load conversation.')
          return null
        }

        if (existing?.id) {
          setConversationId(existing.id)
          return existing.id
        }

        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            type: 'direct',
            direct_user_a: ids[0],
            direct_user_b: ids[1],
            created_by: session.user.id,
          })
          .select('id')
          .single()

        if (createError) {
          console.error('create direct conversation error', createError)
          setChatError(createError.message || 'Failed to create conversation.')
          return null
        }

        setConversationId(created?.id || null)
        return created?.id || null
      }

      if (activeTarget.type === 'team' && activeTarget.teamId) {
        const rawTeamId = activeTarget.teamId
        const teamId = typeof rawTeamId === 'string' ? Number(rawTeamId) : rawTeamId
        if (!Number.isFinite(teamId)) {
          setChatError('Invalid team id. Refresh and try again.')
          return null
        }

        const { data: existing, error: existingError } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'team')
          .eq('team_id', teamId)
          .maybeSingle()

        if (existingError) {
          console.error('load team conversation error', existingError)
          setChatError(existingError.message || 'Failed to load conversation.')
          return null
        }

        if (existing?.id) {
          setConversationId(existing.id)
          return existing.id
        }

        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            type: 'team',
            team_id: teamId,
            created_by: session.user.id,
          })
          .select('id')
          .single()

        if (createError) {
          console.error('create team conversation error', createError)
          setChatError(createError.message || 'Failed to create conversation.')
          return null
        }

        setConversationId(created?.id || null)
        return created?.id || null
      }

      return null
    } finally {
      setResolvingConversation(false)
    }
  }, [session, activeTarget])

  useEffect(() => {
    if (!session?.user || !activeTarget) return
    resolveConversationId()
  }, [session, activeTarget, resolveConversationId])

  useEffect(() => {
    setMessages([])
    setPolls({})
    setConversationId(null)
    setChatError(null)
  }, [activeTargetId])

  const loadPolls = async (convId: string) => {
    const { data: pollRows } = await supabase
      .from('polls')
      .select('id, question, created_by, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    const pollIds = (pollRows || []).map((p: any) => p.id)
    if (pollIds.length === 0) {
      setPolls({})
      return
    }

    const { data: optionRows } = await supabase
      .from('poll_options')
      .select('id, poll_id, option_text')
      .in('poll_id', pollIds)

    const { data: voteRows } = await supabase
      .from('poll_votes')
      .select('poll_id, option_id, user_id')
      .in('poll_id', pollIds)

    const optionsByPoll: Record<string, PollOption[]> = {}
    ;(optionRows || []).forEach((opt: any) => {
      if (!optionsByPoll[opt.poll_id]) optionsByPoll[opt.poll_id] = []
      optionsByPoll[opt.poll_id].push({
        id: opt.id,
        option_text: opt.option_text,
        votes: 0,
      })
    })

    const userVotes: Record<string, string | null> = {}
    ;(voteRows || []).forEach((vote: any) => {
      const pollId = vote.poll_id
      const optionId = vote.option_id
      if (vote.user_id === session?.user?.id) {
        userVotes[pollId] = optionId
      }
      const list = optionsByPoll[pollId]
      const target = list?.find((o) => o.id === optionId)
      if (target) target.votes += 1
    })

    const mapped: Record<string, Poll> = {}
    ;(pollRows || []).forEach((poll: any) => {
      const options = optionsByPoll[poll.id] || []
      const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)
      mapped[poll.id] = {
        id: poll.id,
        question: poll.question,
        options,
        totalVotes,
        userVoteOptionId: userVotes[poll.id] || null,
      }
    })

    setPolls(mapped)
  }

  const refreshPoll = async (pollId: string) => {
    const { data: pollRow } = await supabase
      .from('polls')
      .select('id, question, created_by, created_at')
      .eq('id', pollId)
      .single()

    if (!pollRow) return

    const { data: optionRows } = await supabase
      .from('poll_options')
      .select('id, poll_id, option_text')
      .eq('poll_id', pollId)

    const { data: voteRows } = await supabase
      .from('poll_votes')
      .select('poll_id, option_id, user_id')
      .eq('poll_id', pollId)

    const options = (optionRows || []).map((opt: any) => ({
      id: opt.id,
      option_text: opt.option_text,
      votes: 0,
    }))

    let userVoteOptionId: string | null = null
    ;(voteRows || []).forEach((vote: any) => {
      if (vote.user_id === session?.user?.id) {
        userVoteOptionId = vote.option_id
      }
      const target = options.find((o) => o.id === vote.option_id)
      if (target) target.votes += 1
    })

    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)

    setPolls((prev) => ({
      ...prev,
      [pollId]: {
        id: pollRow.id,
        question: pollRow.question,
        options,
        totalVotes,
        userVoteOptionId,
      },
    }))
  }

  useEffect(() => {
    if (!conversationId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, type, poll_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages((data || []) as Message[])
      await loadPolls(conversationId)
    }

    loadMessages()
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !socketRef.current) return
    const socket = socketRef.current
    const room = `chat:${conversationId}`
    socket.emit('chat:join', { room })

    const handleIncoming = (msg: Message) => {
      if (!msg || msg.conversation_id !== conversationId) return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (msg.type === 'poll' && msg.poll_id) {
        refreshPoll(msg.poll_id)
      }
    }

    socket.on('chat:message', handleIncoming)

    return () => {
      socket.off('chat:message', handleIncoming)
      socket.emit('chat:leave', { room })
    }
  }, [conversationId])

  useEffect(() => {
    pollsRef.current = polls
  }, [polls])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
          if (msg.type === 'poll' && msg.poll_id) {
            refreshPoll(msg.poll_id)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes' },
        (payload) => {
          const pollId = (payload.new as any)?.poll_id || (payload.old as any)?.poll_id
          if (pollId && pollsRef.current[pollId]) {
            refreshPoll(pollId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    if (!messagesRef.current) return
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, polls])

  useEffect(() => {
    if (!session?.user) return
    const missing = Array.from(
      new Set(messages.map((m) => m.sender_id).filter((id): id is string => !!id))
    ).filter((id) => !profiles[id])

    if (missing.length === 0) return

    const loadProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, city')
        .in('id', missing)
      const map: Record<string, ProfileMini> = {}
      ;(data || []).forEach((p: any) => {
        map[p.id] = p
      })
      setProfiles((prev) => ({ ...prev, ...map }))
    }

    loadProfiles()
  }, [messages, profiles, session])

  const sendMessage = async () => {
    if (!session?.user) return
    if (resolvingConversation) {
      setChatError('Setting up chat. Try again in a moment.')
      return
    }
    let activeConversationId = conversationId
    if (!activeConversationId) {
      activeConversationId = await resolveConversationId()
    }
    if (!activeConversationId) {
      setChatError('Chat not ready yet. Try again in a moment.')
      return
    }
    const value = text.trim()
    if (!value) return
    setSending(true)
    setChatError(null)
    setText('')
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        sender_id: session.user.id,
        content: value,
        type: 'text',
      })
      .select('id, sender_id, content, type, poll_id, created_at, conversation_id')
      .single()
    if (error) {
      console.error('send message error', error)
      setChatError(error.message || 'Failed to send message.')
    } else if (data && socketRef.current) {
      socketRef.current.emit('chat:send', {
        room: `chat:${activeConversationId}`,
        message: data,
      })
    }
    setSending(false)
  }

  const createPoll = async () => {
    if (!conversationId || !session?.user) return
    const question = pollQuestion.trim()
    const options = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (!question || options.length < 2) return

    setPollOpen(false)
    setPollQuestion('')
    setPollOptions(['', ''])

    const { data: pollRow } = await supabase
      .from('polls')
      .insert({
        conversation_id: conversationId,
        question,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (!pollRow?.id) return

    await supabase.from('poll_options').insert(
      options.map((opt) => ({
        poll_id: pollRow.id,
        option_text: opt,
      }))
    )

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      type: 'poll',
      poll_id: pollRow.id,
      content: null,
    })
  }

  const voteOnPoll = async (pollId: string, optionId: string) => {
    if (!session?.user) return
    await supabase.from('poll_votes').upsert(
      {
        poll_id: pollId,
        option_id: optionId,
        user_id: session.user.id,
      },
      { onConflict: 'poll_id,user_id' }
    )
    refreshPoll(pollId)
  }

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
    <main className="rn-chat-shell">
      <div className="rn-chat-layout">
        <aside className="rn-panel rn-chat-sidebar">
          <div className="rn-chat-sidebar-header">
            <h2>Messages</h2>
            <span>{targets.length} active</span>
          </div>
          <div className="rn-chat-search">
            <SearchIcon size={16} />
            <input type="text" placeholder="Search conversations..." />
          </div>
          <div className="rn-chat-group">
            <h3>Direct</h3>
            <div className="rn-chat-list">
              {targets.filter((t) => t.type === 'direct').length === 0 ? (
                <p className="rn-muted">No connected users yet.</p>
              ) : (
                targets
                  .filter((t) => t.type === 'direct')
                  .map((t) => {
                    const profile = t.otherUserId ? profiles[t.otherUserId] : null
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`rn-chat-item ${t.id === activeTargetId ? 'is-active' : ''}`}
                        onClick={() => setActiveTargetId(t.id)}
                      >
                        <Avatar src={profile?.avatar_url} size={36} />
                        <span>
                          <strong>{t.name}</strong>
                          <em>{t.subtitle}</em>
                        </span>
                      </button>
                    )
                  })
              )}
            </div>
          </div>
          <div className="rn-chat-group">
            <h3>Teams</h3>
            <div className="rn-chat-list">
              {targets.filter((t) => t.type === 'team').length === 0 ? (
                <p className="rn-muted">Join a team to start chatting.</p>
              ) : (
                targets
                  .filter((t) => t.type === 'team')
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`rn-chat-item ${t.id === activeTargetId ? 'is-active' : ''}`}
                      onClick={() => setActiveTargetId(t.id)}
                    >
                      <span className="rn-chat-initial">{t.name.slice(0, 1).toUpperCase()}</span>
                      <span>
                        <strong>{t.name}</strong>
                        <em>{t.subtitle}</em>
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </aside>

        <section className="rn-panel rn-chat-thread">
          {!activeTarget ? (
            <div className="rn-chat-empty-state">
              <div className="rn-chat-empty-icon" aria-hidden="true" />
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging.</p>
            </div>
          ) : (
            <>
              <header className="rn-chat-thread-header">
                <div>
                  <h2>{activeTarget.name}</h2>
                  <p className="rn-muted">{activeTarget.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="rn-secondary-btn"
                  onClick={() => setPollOpen((v) => !v)}
                >
                  {pollOpen ? 'Close Poll' : 'Create Poll'}
                </button>
              </header>

              {pollOpen && (
                <div className="rn-poll-compose">
                  <input
                    type="text"
                    placeholder="Poll question"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                  />
                  <div className="rn-poll-options">
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={`opt-${idx}`}
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions]
                          next[idx] = e.target.value
                          setPollOptions(next)
                        }}
                      />
                    ))}
                  </div>
                  <div className="rn-actions">
                    <button
                      type="button"
                      className="rn-secondary-btn"
                      onClick={() => setPollOptions((prev) => [...prev, ''])}
                      disabled={pollOptions.length >= 4}
                    >
                      Add option
                    </button>
                    <button type="button" className="rn-primary-btn" onClick={createPoll}>
                      Post Poll
                    </button>
                  </div>
                </div>
              )}

              <div className="rn-chat-messages" ref={messagesRef}>
                {messages.length === 0 ? (
                  <div className="rn-chat-empty">No messages yet. Say hello.</div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === session?.user?.id
                    const sender = msg.sender_id ? profiles[msg.sender_id] : null
                    const name = isMe
                      ? 'You'
                      : sender
                        ? `${sender.first_name} ${sender.last_name}`.trim()
                        : 'Member'

                    if (msg.type === 'poll' && msg.poll_id) {
                      const poll = polls[msg.poll_id]
                      return (
                        <div key={msg.id} className={`rn-chat-bubble ${isMe ? 'is-me' : ''}`}>
                          <div className="rn-chat-meta">{name}</div>
                          <div className="rn-poll-card">
                            <strong>{poll?.question || 'Poll'}</strong>
                            <div className="rn-poll-list">
                              {(poll?.options || []).map((opt) => {
                                const percent =
                                  poll && poll.totalVotes > 0
                                    ? Math.round((opt.votes / poll.totalVotes) * 100)
                                    : 0
                                const active = poll?.userVoteOptionId === opt.id
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    className={`rn-poll-option ${active ? 'is-active' : ''}`}
                                    onClick={() => voteOnPoll(poll.id, opt.id)}
                                  >
                                    <span>{opt.option_text}</span>
                                    <em>{opt.votes}</em>
                                    <span className="rn-poll-bar" style={{ width: `${percent}%` }} />
                                  </button>
                                )
                              })}
                            </div>
                            <p className="rn-muted">{poll?.totalVotes || 0} votes</p>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} className={`rn-chat-bubble ${isMe ? 'is-me' : ''}`}>
                        <div className="rn-chat-meta">{name}</div>
                        <div className="rn-chat-text">{msg.content}</div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="rn-chat-composer">
                <input
                  type="text"
                  placeholder={resolvingConversation ? 'Preparing chat...' : 'Type a message...'}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage()
                  }}
                  disabled={sending || resolvingConversation}
                />
                <button
                  className="rn-primary-btn"
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || resolvingConversation}
                >
                  Send
                </button>
              </div>
              {chatError && <p className="rn-message error">{chatError}</p>}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
