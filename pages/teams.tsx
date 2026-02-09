import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { LoaderIcon, PlusIcon } from '../components/Icons'
import Avatar from '../components/Avatar'

type Team = {
  id: number
  name: string
  description: string
  max_members: number
  member_count: number
  created_at: string
}

export default function Teams() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const init = async () => {
      try {
        setLoading(true)
        setError(null)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (isMounted) {
            setLoading(false)
          }
          router.push('/')
          return
        }

        const { data: collegeInfo, error: collegeError } = await supabase
          .from('college_info')
          .select('college_id')
          .eq('user_id', session.user.id)
          .single()

        if (collegeError) {
          throw collegeError
        }

        if (!collegeInfo) {
          if (isMounted) setLoading(false)
          return
        }

        if (isMounted) setCollegeId(collegeInfo.college_id)

        const response = await fetch(`/api/teams?college_id=${collegeInfo.college_id}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result?.error || 'Failed to load teams')
        }

        const result = await response.json()
        if (isMounted) setTeams(result.teams || [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          if (isMounted) setError(err?.message || 'Failed to load teams')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [router])

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

  if (!collegeId) {
    return (
      <main className="rn-shell">
        <div className="rn-empty">
          <h3>Complete Your College Information</h3>
          <p>To view and create teams, you need to set your college first.</p>
          <button onClick={() => router.push('/profile')} className="rn-primary-btn" style={{ marginTop: 12 }}>
            Go to Profile
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="rn-teams-shell">
      <div className="rn-teams-header">
        <h1>Teams</h1>
      </div>

      {error && (
        <div className="rn-message error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="rn-teams-bar">
        <span className="rn-count">{teams.length} teams created</span>
        <div className="rn-teams-actions">
          <div className="rn-select-wrap rn-compact-select">
            <select aria-label="Sort teams">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="members">Most members</option>
            </select>
          </div>
          <button className="rn-primary-btn" onClick={() => router.push('/create-team')} type="button">
            <PlusIcon size={16} />
            Create Team
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="rn-empty-card">
          <div className="rn-empty-icon">
            <PlusIcon size={28} />
          </div>
          <p>No teams created yet</p>
          <button className="rn-primary-btn" onClick={() => router.push('/create-team')} type="button">
            <PlusIcon size={16} />
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="rn-team-grid">
          {teams.map((team) => (
            <div key={team.id} className="rn-team-card" onClick={() => router.push(`/teams/${team.id}`)}>
              <h3>{team.name}</h3>
              <p>{team.description || '(No description)'}</p>
              <div className="rn-team-meta">
                <span>
                  {team.member_count} / {team.max_members} members
                </span>
                <button
                  type="button"
                  className="rn-link-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/teams/${team.id}`)
                  }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
