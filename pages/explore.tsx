import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getInitialSession, signInWithGoogle } from '../lib/auth'
import Avatar from '../components/Avatar'
import { ChevronLeftIcon, ChevronRightIcon, UserPlusIcon, XIcon } from '../components/Icons'
import Skeleton from '../components/Skeleton'

type Skill = {
  id: number
  name: string
  category?: string
}

type Person = {
  id: string
  name: string
  email: string
  city: string
  role?: string | null
  bio: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  avatar_url?: string
  skills: Skill[]
  college_info?: Array<{ college_id: number; major?: string | null; semester?: number | null; colleges: { id: number; name: string; city: string } }>
}

const LIMIT = 12

export default function ExploreFreelancers() {
  const router = useRouter()
  const [freelancers, setFreelancers] = useState<Person[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [allUniversities, setAllUniversities] = useState<Array<{ id: number; name: string; city: string }>>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [session, setSession] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // Filters
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const [universityQuery, setUniversityQuery] = useState('')

  // Fetch available cities and skills
  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        const { session, timedOut, error } = await getInitialSession(supabase)
        if (!mounted) return

        if (timedOut) {
          console.warn('Initial auth session check timed out on Explore page.')
        } else if (error) {
          console.error('Initial auth session check failed on Explore page:', error)
        }

        setSession(session)
      } finally {
        if (mounted) setAuthReady(true)
      }
    }
    void getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return
      setSession(sess)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return

    if (session?.user) {
      setShowSignupModal(false)
      return
    }

    if (typeof window === 'undefined') return

    const dismissed = window.localStorage.getItem('rn_signup_dismissed') === '1'
    setShowSignupModal(!dismissed)
  }, [session, authReady])

  useEffect(() => {
    if (!session?.user) {
      setConnectedIds(new Set())
      return
    }

    let active = true
    const loadConnections = async () => {
      const { data: connectionRows } = await supabase
        .from('connections')
        .select('requester_id, recipient_id, status')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)

      if (!active) return
      const ids = new Set<string>()
      const pending = new Set<string>()
      ;(connectionRows || []).forEach((c: any) => {
        const other =
          c.requester_id === session.user.id ? c.recipient_id : c.requester_id
        if (!other) return
        if (c.status === 'accepted') {
          ids.add(other)
        } else if (c.status === 'pending' && c.requester_id === session.user.id) {
          pending.add(other)
        }
      })
      setConnectedIds(ids)
      setPendingIds(pending)
    }

    loadConnections()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    const init = async () => {
      const { data: collegesData } = await supabase
        .from('colleges')
        .select('id, name, city')
        .order('name')

      if (collegesData) {
        setAllUniversities(collegesData)
      }

      // Fetch all skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('id, name, category')
        .order('name')

      if (skillsData) {
        setAllSkills(skillsData)
      }
    }

    init()
  }, [])

  // Fetch freelancers based on filters
  useEffect(() => {
    const fetchFreelancers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedUniversityId) params.append('university_id', selectedUniversityId)
        if (selectedSkillIds.length > 0) {
          params.append('skills', selectedSkillIds.join(','))
        }
        params.append('limit', LIMIT.toString())
        params.append('offset', (page * LIMIT).toString())

        const response = await fetch(`/api/freelancers?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setFreelancers(result.data)
          setTotalCount(result.total)
        } else {
          console.error('Fetch error:', result.error)
        }
      } catch (error) {
        console.error('Error fetching freelancers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFreelancers()
  }, [selectedUniversityId, selectedSkillIds, page])

  const handleSkillToggle = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    )
    setPage(0) // Reset to first page
  }

  const filteredUniversities = allUniversities
    .filter((u) => {
      const q = universityQuery.trim().toLowerCase()
      if (!q) return true
      return `${u.name} ${u.city}`.toLowerCase().includes(q)
    })

  useEffect(() => {
    const q = universityQuery.trim().toLowerCase()
    if (!q) return
    if (filteredUniversities.length === 1) {
      const only = filteredUniversities[0]
      if (only && String(only.id) !== selectedUniversityId) {
        setSelectedUniversityId(String(only.id))
        setPage(0)
      }
    }
  }, [universityQuery, filteredUniversities, selectedUniversityId])

  const filteredSkills = allSkills.filter((skill) => {
    const q = skillQuery.trim().toLowerCase()
    if (!q) return true
    return `${skill.name} ${skill.category || ''}`.toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(totalCount / LIMIT)

  const handleSignIn = async () => {
    const { error } = await signInWithGoogle(supabase)
    if (error) console.error('OAuth error', error)
  }

  const handleSignupDismiss = () => {
    setShowSignupModal(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rn_signup_dismissed', '1')
    }
  }

  const handleConnect = async (recipientId: string) => {
    if (!session?.user?.id) {
      alert('Please log in to connect.')
      return
    }
    if (recipientId === session.user.id) return
    if (connectedIds.has(recipientId) || pendingIds.has(recipientId)) return

    setConnectingId(recipientId)
    try {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requesterId: session.user.id,
          recipientId,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to send connection request')
      }
      setPendingIds((prev) => new Set(prev).add(recipientId))
    } catch (error: any) {
      console.error('Connection request failed:', error)
      alert('Failed to send request. Please check your network and try again.')
    } finally {
      setConnectingId(null)
    }
  }

  return (
    <main className="rn-shell">
      {authReady && !session && showSignupModal && (
        <div className="rn-modal-backdrop" role="dialog" aria-modal="true">
          <div className="rn-modal">
            <button className="rn-modal-close" type="button" onClick={handleSignupDismiss} aria-label="Close">
              <XIcon size={16} />
            </button>
            <div className="rn-modal-header">
              <span className="rn-modal-icon" aria-hidden="true">
                <UserPlusIcon size={20} />
              </span>
              <h3>Sign up to explore RisingNetwork</h3>
            </div>
            <p>
              Create your profile to unlock full access to people, teams, and personalized matches.
            </p>
            <div className="rn-modal-actions">
              <button className="rn-primary-btn" type="button" onClick={handleSignIn}>
                Sign up with Google
              </button>
              <button className="rn-secondary-btn" type="button" onClick={handleSignIn}>
                Log in with Google
              </button>
            </div>
            <div className="rn-modal-footer">
              <button className="rn-modal-link" type="button" onClick={handleSignupDismiss}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="rn-mobile-filters">
        <button
          type="button"
          className="rn-secondary-btn"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      <div className="rn-layout">
        <aside className={`rn-panel rn-panel-filters ${filtersOpen ? 'is-open' : ''}`}>
          <h2>Filters</h2>

          <div className="rn-field">
            <label htmlFor="university">University</label>
            <div className="rn-select-wrap">
              <input
                className="rn-filter-search"
                type="text"
                placeholder="Search universities"
                value={universityQuery}
                onChange={(e) => {
                  setUniversityQuery(e.target.value)
                  setSelectedUniversityId('')
                  setPage(0)
                }}
              />
              <select
                id="university"
                value={selectedUniversityId}
                onChange={(e) => {
                  setSelectedUniversityId(e.target.value)
                  setPage(0)
                }}
              >
                <option value="">All universities</option>
                {filteredUniversities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rn-field">
            <label>Skills</label>
            <input
              className="rn-filter-search"
              type="text"
              placeholder="Search skills"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
            />
            <div className="rn-skill-list">
              {filteredSkills.map((skill) => (
                <label
                  key={skill.id}
                  className={`rn-skill ${selectedSkillIds.includes(skill.id) ? 'is-active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSkillIds.includes(skill.id)}
                    onChange={() => handleSkillToggle(skill.id)}
                  />
                  <span>
                    {skill.name}
                    {skill.category && <em>{skill.category}</em>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="rn-results">
          <header className="rn-results-header">
            <div>
              <h1>Discover People</h1>
              <p>{totalCount} people found</p>
            </div>
            {totalPages > 1 && (
              <div className="rn-page-indicator">
                Page {page + 1} of {totalPages}
              </div>
            )}
          </header>

          {authReady && !session && !showSignupModal && (
            <div className="rn-login-card">
              <div>
                <h3>Sign up to explore people</h3>
                <p>Create your profile to connect, join teams, and unlock personalized matches.</p>
              </div>
              <button className="rn-primary-btn" type="button" onClick={handleSignIn}>
                Sign up with Google
              </button>
            </div>
          )}

          <button
            type="button"
            className={`rn-project-cta ${!session ? 'is-locked' : ''}`}
            disabled={!session}
            onClick={() => {
              if (session) router.push('/projects')
            }}
          >
            <div>
              <h3>Work on real student projects</h3>
              <p>Browse open projects and request to join teams that match your skills.</p>
            </div>
            <span className="rn-project-cta-btn">View Projects</span>
          </button>

          {loading ? (
            <div role="status" aria-label="Loading people" aria-busy="true" className="rn-cards">
              {Array.from({ length: 6 }).map((_, idx) => (
                <article key={idx} className="rn-card">
                  <div className="rn-card-head">
                    <Skeleton className="rn-skeleton-circle" style={{ width: 56, height: 56 }} />
                    <div className="rn-skeleton-stack" style={{ flex: 1 }}>
                      <Skeleton style={{ width: '58%', height: 18 }} />
                      <Skeleton style={{ width: '74%', height: 14 }} />
                    </div>
                  </div>
                  <div className="rn-card-actions rn-card-actions-split">
                    <Skeleton style={{ width: 118, height: 36 }} />
                    <Skeleton style={{ width: 102, height: 36 }} />
                  </div>
                </article>
              ))}
            </div>
          ) : freelancers.length === 0 ? (
            <div className="rn-empty">No professionals match your filters yet.</div>
          ) : (
            <>
              <div className={`rn-cards ${!session ? 'is-locked' : ''}`}>
                {freelancers.map((freelancer) => (
                  <article
                    key={freelancer.id}
                    className="rn-card is-clickable"
                  >
                    <button
                      type="button"
                      className="rn-card-hitbox"
                      aria-label={`Open ${freelancer.name || 'profile'}`}
                      onClick={() => router.push(`/profiles/${freelancer.id}`)}
                    />
                    <div className="rn-card-head">
                      <Avatar src={freelancer.avatar_url} alt="avatar" size={56} />
                      <div>
                        <h3>
                          {freelancer.name || 'Unknown'}
                        </h3>
                        <div className="rn-card-meta">
                          <span>
                            {(() => {
                              const info = freelancer.college_info?.[0]
                              const sem = info?.semester
                              const major = info?.major
                              if (sem || major) {
                                const semText = sem ? `Sem-${sem}` : 'Semester'
                                const majorText = major ? major : 'Field'
                                return `${semText} | ${majorText}`
                              }
                              return freelancer.college_info?.[0]?.colleges?.name ||
                                freelancer.city ||
                                'Independent'
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rn-card-actions rn-card-actions-split">
                      {session?.user?.id === freelancer.id ? (
                        <button className="rn-secondary-btn" type="button" disabled onClick={(e) => e.stopPropagation()}>
                          You
                        </button>
                      ) : connectedIds.has(freelancer.id) ? (
                        <button
                          className="rn-secondary-btn"
                          type="button"
                          disabled
                          onClick={(e) => e.stopPropagation()}
                        >
                          Connected
                        </button>
                      ) : pendingIds.has(freelancer.id) ? (
                        <button className="rn-secondary-btn" type="button" disabled onClick={(e) => e.stopPropagation()}>
                          Request Sent
                        </button>
                      ) : (
                      <button
                        className="rn-connect-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConnect(freelancer.id)
                        }}
                        disabled={connectingId === freelancer.id}
                      >
                        {connectingId === freelancer.id ? 'Sending...' : 'Connect'}
                      </button>
                      )}
                      {freelancer.email && (
                        <button
                          className="rn-secondary-btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`mailto:${freelancer.email}`)
                          }}
                        >
                          Contact
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                </div>

              {totalPages > 1 && (
                <div className="rn-pagination">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                    title="Previous"
                    className="rn-page-btn"
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <span aria-label={`Page ${page + 1} of ${totalPages}`}>
                    {page + 1}/{totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    aria-label="Next page"
                    title="Next"
                    className="rn-page-btn"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
