import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from '../components/Icons'

type Skill = {
  id: number
  name: string
  category?: string
}

type Person = {
  id: string
  first_name: string
  last_name: string
  email: string
  city: string
  role?: string | null
  bio: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  avatar_url?: string
  skills: Skill[]
}

const LIMIT = 12

export default function ExploreFreelancers() {
  const router = useRouter()
  const [freelancers, setFreelancers] = useState<Person[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [session, setSession] = useState<any>(null)

  // Filters
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Fetch available cities and skills
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    const init = async () => {
      // Fetch all unique cities
      const { data: citiesData } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null)

      if (citiesData) {
        const uniqueCities = Array.from(new Set(citiesData.map((p: any) => p.city))).filter(Boolean)
        setAllCities(uniqueCities as string[])
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
        if (selectedCity) params.append('city', selectedCity)
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
  }, [selectedCity, selectedSkillIds, page])

  const handleSkillToggle = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    )
    setPage(0) // Reset to first page
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value)
    setPage(0) // Reset to first page
  }

  const totalPages = Math.ceil(totalCount / LIMIT)

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) console.error('OAuth error', error)
  }

  return (
    <main className="rn-shell">
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
            <label htmlFor="city">City</label>
            <div className="rn-select-wrap">
              <select id="city" value={selectedCity} onChange={handleCityChange}>
                <option value="">All cities</option>
                {allCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rn-field">
            <label>Skills</label>
            <div className="rn-skill-list">
              {allSkills.map((skill) => (
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

          {!session && (
            <div className="rn-login-card">
              <div>
                <h3>Sign in to unlock teams and personalized matches</h3>
                <p>Connect your Google account to save your profile, join teams, and get recommendations.</p>
              </div>
              <button className="rn-primary-btn" type="button" onClick={handleSignIn}>
                Sign in with Google
              </button>
            </div>
          )}

          {loading ? (
            <div role="status" aria-label="Loading" className="rn-loading">
              <span className="spin">
                <LoaderIcon size={20} />
              </span>
            </div>
          ) : freelancers.length === 0 ? (
            <div className="rn-empty">No professionals match your filters yet.</div>
          ) : (
            <>
              <div className="rn-cards">
                {freelancers.map((freelancer) => (
                  <article key={freelancer.id} className="rn-card">
                    <div className="rn-card-head">
                      <Avatar src={freelancer.avatar_url} alt="avatar" size={56} />
                      <div>
                        <h3>
                          {freelancer.first_name} {freelancer.last_name}
                        </h3>
                        <div className="rn-card-meta">
                          <span className="rn-badge">
                            {freelancer.role
                              ? freelancer.role.charAt(0).toUpperCase() + freelancer.role.slice(1)
                              : 'Professional'}
                          </span>
                          <span>{freelancer.city || 'Remote'}</span>
                        </div>
                      </div>
                    </div>

                    {freelancer.bio && <p className="rn-bio">{freelancer.bio}</p>}

                    {freelancer.skills.length > 0 && (
                      <div className="rn-tags">
                        {freelancer.skills.map((skill) => (
                          <span key={skill.id}>{skill.name}</span>
                        ))}
                      </div>
                    )}

                    <div className="rn-card-actions rn-card-actions-split">
                      <button
                        className="rn-primary-btn"
                        type="button"
                        onClick={() => router.push(`/profiles/${freelancer.id}`)}
                      >
                        View Profile
                      </button>
                      {freelancer.email && (
                        <button
                          className="rn-secondary-btn"
                          type="button"
                          onClick={() => window.open(`mailto:${freelancer.email}`)}
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
