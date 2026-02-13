import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { PlusIcon } from '../components/Icons'
import Avatar from '../components/Avatar'

export default function CreateTeam() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/')
        return
      }

      setUserId(session.user.id)
      setAccessToken(session.access_token)

      // Get user's college
      const { data: collegeInfo } = await supabase
        .from('college_info')
        .select('college_id')
        .eq('user_id', session.user.id)
        .single()

      if (!collegeInfo) {
        setMessage({ type: 'error', text: 'You must be a student with a college to create a team.' })
        setLoading(false)
        return
      }

      setCollegeId(collegeInfo.college_id)

      setLoading(false)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Team name is required' })
      return
    }

    if (!collegeId || !userId || !accessToken) {
      setMessage({ type: 'error', text: 'Missing college or user info' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Create team
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          college_id: collegeId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team')
      }

      const team = result.team

      setMessage({ type: 'success', text: 'Team created successfully!' })
      setTimeout(() => router.push('/teams'), 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="rn-shell">
        <div role="status" aria-label="Loading" className="rn-loading">
          <span className="spin">
            <PlusIcon size={20} />
          </span>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Create New Team</h1>

      {message && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 4,
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Team Name */}
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Team Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., AI & Web Dev"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 16,
            }}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: 1,
              padding: 12,
              border: '1px solid #3b82f6',
              borderRadius: 8,
              backgroundColor: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
              e.currentTarget.style.borderColor = '#2563eb'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6'
              e.currentTarget.style.borderColor = '#3b82f6'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rn-primary-btn"
            style={{
              flex: 1,
              padding: 12,
              opacity: (saving || !name.trim()) ? 0.6 : 1,
              cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 16,
            }}
          >
            {saving ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </main>
  )
}
