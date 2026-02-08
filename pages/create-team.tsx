import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { PlusIcon } from '../components/Icons'

export default function CreateTeam() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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

      // Get user's college
      const { data: collegeInfo } = await supabase
        .from('college_info')
        .select('college_id')
        .eq('user_id', session.user.id)
        .single()

      if (!collegeInfo) {
        setMessage({ type: 'error', text: 'You must be a student with a college to create a team.' })
        return
      }

      setCollegeId(collegeInfo.college_id)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Team name is required' })
      return
    }

    if (!collegeId || !userId) {
      setMessage({ type: 'error', text: 'Missing college or user info' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          college_id: collegeId,
          created_by: userId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Team created successfully!' })
        setTimeout(() => router.push('/teams'), 1000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create team' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setSaving(false)
    }
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Team Name */}
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
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
              padding: 8,
              border: '1px solid #d1d5db',
              borderRadius: 4,
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's your team about?"
            rows={4}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="icon-only" aria-label={saving ? 'Creating...' : 'Create Team'} title={saving ? 'Creating...' : 'Create Team'} style={{ flex: 1 }}>
            <PlusIcon size={18} />
          </button>
        </div>
      </form>
    </main>
  )
}
