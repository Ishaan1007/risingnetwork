import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import Skeleton from '../components/Skeleton'

type Project = {
  id: string
  title: string
  description: string
  skills: string[] | null
  created_at: string
}

type RequestRow = {
  id: string
  project_id: string
  user_id: string
  message: string | null
  status: string | null
  created_at: string
  profiles?: {
    name?: string | null
    avatar_url?: string | null
    city?: string | null
  } | null
}

const ADMIN_EMAILS = new Set(['ishaanjain4u@gmail.com', 'iashjain1@gmail.com'])

export default function ProjectsPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [myRequests, setMyRequests] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = useMemo(() => {
    const email = session?.user?.email
    return typeof email === 'string' && ADMIN_EMAILS.has(email)
  }, [session])

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('projects')
        .select('id, title, description, skills, created_at')
        .order('created_at', { ascending: false })
      setProjects((data || []) as Project[])
      setLoading(false)
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setMyRequests(new Set())
      return
    }

    const loadMyRequests = async () => {
      const { data } = await supabase
        .from('project_requests')
        .select('project_id')
        .eq('user_id', session.user.id)
      const ids = new Set<string>((data || []).map((r: any) => r.project_id))
      setMyRequests(ids)
    }
    loadMyRequests()
  }, [session])

  useEffect(() => {
    if (!isAdmin) {
      setRequests([])
      return
    }

    const loadRequests = async () => {
      const { data } = await supabase
        .from('project_requests')
        .select(
          'id, project_id, user_id, message, status, created_at, profiles(name, avatar_url, city)'
        )
        .order('created_at', { ascending: false })
      setRequests((data || []) as RequestRow[])
    }
    loadRequests()
  }, [isAdmin])

  const handleCreateProject = async () => {
    if (!isAdmin) return
    const cleanTitle = title.trim()
    const cleanDesc = description.trim()
    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!cleanTitle || !cleanDesc) return

    setSaving(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: cleanTitle,
        description: cleanDesc,
        skills,
        created_by: session?.user?.id || null,
      })
      .select('id, title, description, skills, created_at')
      .single()

    setSaving(false)

    if (error) {
      console.error('create project error', error)
      return
    }

    if (data) {
      setProjects((prev) => [data as Project, ...prev])
      setTitle('')
      setDescription('')
      setSkillsInput('')
      setShowForm(false)
    }
  }

  const handleRequest = async (projectId: string) => {
    if (!session?.user) {
      router.push('/explore')
      return
    }
    if (myRequests.has(projectId)) return

    const message = window.prompt('Tell the admin why you want to join (optional):', '') || ''

    const { error } = await supabase.from('project_requests').insert({
      project_id: projectId,
      user_id: session.user.id,
      message: message.trim() || null,
      status: 'pending',
    })

    if (error) {
      console.error('request project error', error)
      return
    }

    setMyRequests((prev) => new Set(prev).add(projectId))
  }

  return (
    <main className="rn-shell">
      <div className="rn-projects-header">
        <div>
          <h1>Projects</h1>
          <p>Open opportunities to collaborate with students</p>
        </div>
        {isAdmin && (
          <button className="rn-primary-btn" type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : 'Add Project'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="rn-panel rn-project-form">
          <h2>New Project</h2>
          <div className="rn-form">
            <div className="rn-form-field full">
              <label htmlFor="project-title">Title</label>
              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Campus Events App"
              />
            </div>
            <div className="rn-form-field full">
              <label htmlFor="project-desc">Description</label>
              <textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project, goals, and expected timeline."
                rows={4}
              />
            </div>
            <div className="rn-form-field full">
              <label htmlFor="project-skills">Skills (comma separated)</label>
              <input
                id="project-skills"
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="React, Node.js, UI/UX"
              />
            </div>
            <div className="rn-actions">
              <button
                className="rn-primary-btn"
                type="button"
                onClick={handleCreateProject}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Publish Project'}
              </button>
              <button className="rn-secondary-btn" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading projects" aria-busy="true" className="rn-projects-grid">
          {[0, 1, 2].map((idx) => (
            <article key={idx} className="rn-project-card">
              <Skeleton style={{ width: '60%', height: 20 }} />
              <Skeleton style={{ width: '100%', height: 14 }} />
              <Skeleton style={{ width: '88%', height: 14 }} />
              <div className="rn-tags rn-tags-lg">
                <Skeleton style={{ width: 90, height: 30, borderRadius: 999 }} />
                <Skeleton style={{ width: 78, height: 30, borderRadius: 999 }} />
                <Skeleton style={{ width: 102, height: 30, borderRadius: 999 }} />
              </div>
              <div className="rn-project-actions">
                <Skeleton style={{ width: 120, height: 36 }} />
              </div>
            </article>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rn-empty">No projects available yet.</div>
      ) : (
        <div className="rn-projects-grid">
          {projects.map((project) => (
            <article key={project.id} className="rn-project-card">
              <div>
                <h3>{project.title}</h3>
                <p className="rn-muted" style={{ marginTop: 6 }}>
                  {project.description}
                </p>
              </div>
              {project.skills && project.skills.length > 0 && (
                <div className="rn-tags rn-tags-lg">
                  {project.skills.map((skill) => (
                    <span key={`${project.id}-${skill}`}>{skill}</span>
                  ))}
                </div>
              )}
              <div className="rn-project-actions">
                {!session ? (
                  <button className="rn-secondary-btn" type="button" disabled>
                    Sign in to request
                  </button>
                ) : myRequests.has(project.id) ? (
                  <button className="rn-secondary-btn" type="button" disabled>
                    Requested
                  </button>
                ) : (
                  <button className="rn-primary-btn" type="button" onClick={() => handleRequest(project.id)}>
                    Request to Join
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 28 }}>
          <div className="rn-projects-header">
            <div>
              <h2 style={{ fontSize: 20 }}>Requests</h2>
              <p>Review participation requests</p>
            </div>
          </div>
          {requests.length === 0 ? (
            <div className="rn-empty">No requests yet.</div>
          ) : (
            <div className="rn-connection-grid">
              {requests.map((req) => {
                const name = req.profiles?.name || 'Member'
                return (
                  <div key={req.id} className="rn-request-card">
                    <div className="rn-connection-head">
                      <Avatar src={req.profiles?.avatar_url || null} size={44} />
                      <div>
                        <strong>{name || 'Member'}</strong>
                        <span className="rn-muted">{req.profiles?.city || 'Student'}</span>
                      </div>
                    </div>
                    <div className="rn-muted">
                      {req.message ? req.message : 'No message provided.'}
                    </div>
                    <div className="rn-card-actions">
                      <button className="rn-secondary-btn" type="button" disabled>
                        {req.status || 'pending'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
