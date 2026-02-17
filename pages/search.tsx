import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Avatar from '../components/Avatar'
import { LoaderIcon } from '../components/Icons'

type Skill = { id: number; name: string }

type Profile = {
  id: string
  name: string
  city?: string
  role?: string
  bio?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  avatar_url?: string
  skills: Skill[]
}

export default function SearchPage() {
  const router = useRouter()
  const { q } = router.query
  const [term, setTerm] = useState<string>(String(q || ''))
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const LIMIT = 20

  useEffect(() => {
    if (!q) return
    setTerm(String(q))
    setPage(0)
  }, [q])

  useEffect(() => {
    const fetchResults = async () => {
      if (!term) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('q', term)
        params.append('limit', String(LIMIT))
        params.append('offset', String(page * LIMIT))

        const res = await fetch(`/api/search?${params.toString()}`)
        const json = await res.json()
        if (res.ok) setResults(json.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [term, page])

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Search</h1>
      {term && (
        <p style={{ color: '#6b7280', marginTop: 6 }}>
          Results for <strong>{term}</strong>. Use the top search bar to refine.
        </p>
      )}

      {loading ? (
        <div className="card">
          <div role="status" aria-label="Searching" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <span className="spin"><LoaderIcon size={20} /></span>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>No results</h3>
          <p style={{ color: '#6b7280' }}>Try a different name, skill, or city.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {results.map((r) => (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar src={r.avatar_url} alt="avatar" size={56} />
                <h3 style={{ margin: 0 }}>{r.name || 'Unknown'} <small style={{ color: '#6b7280' }}>{r.role}</small></h3>
              </div>
              {r.city && <p style={{ color: '#6b7280', marginTop: 6 }}>{r.city}</p>}
              {r.bio && <p style={{ marginTop: 8 }}>{r.bio}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {r.skills.map(s => (
                  <span key={s.id} style={{ background: '#e6f0ff', color: '#0a66c2', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>{s.name}</span>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => router.push(`/profiles/${r.id}`)}
                  style={{ background: '#2563eb', color: 'white', padding: '6px 10px', borderRadius: 6 }}
                >
                  Open Profile
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/profiles/${r.id}`)}
                  style={{ background: '#10b981', color: 'white', padding: '6px 10px', borderRadius: 6 }}
                >
                  Connect
                </button>
                {r.linkedin_url && (<a href={r.linkedin_url} target="_blank" rel="noreferrer" style={{ background: '#0a66c2', color: 'white', padding: '6px 10px', borderRadius: 6 }}>LinkedIn</a>)}
                {r.github_url && (<a href={r.github_url} target="_blank" rel="noreferrer" style={{ background: '#111', color: 'white', padding: '6px 10px', borderRadius: 6 }}>GitHub</a>)}
                {r.portfolio_url && (<a href={r.portfolio_url} target="_blank" rel="noreferrer" style={{ background: '#f59e0b', color: 'white', padding: '6px 10px', borderRadius: 6 }}>Portfolio</a>)}
              </div>
            </div>
          ))}
        </div>
      )}

    </main>
  )
}
