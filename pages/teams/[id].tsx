import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import {
  LoaderIcon,
  LogOutIcon,
  TrashIcon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from '../../components/Icons'

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Team = {
  id: number
  name: string
  description: string
  max_members: number
  created_by: string
  members: Array<{ user_id: string; profiles: { first_name: string; last_name: string } }>
}

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function TeamDetail() {
  const router = useRouter()
  const { id } = router.query

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [collegStudents, setCollegeStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    action: 'delete' | 'leave' | 'kick'
    memberId?: string
    teamId?: number
  } | null>(null)

  useEffect(() => {
    if (!id) return

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

      if (collegeInfo) {
        setCollegeId(collegeInfo.college_id)
      }

      // Fetch team
      const { data: teamData } = await supabase
        .from('teams')
        .select(
          `
          id,
          name,
          description,
          max_members,
          created_by,
          team_members (
            user_id,
            status,
            profiles (
              first_name,
              last_name
            )
          )
        `
        )
        .eq('id', id)
        .single()

      if (teamData) {
        setTeam({
          ...teamData,
          members: teamData.team_members.filter((tm: any) => tm.status === 'accepted'),
        })
      }

      // Fetch other students in college (for inviting)
      if (collegeInfo) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('role', 'student')
          .neq('id', session.user.id)

        if (studentsData) {
          // Filter to only students in the same college
          const { data: collegeStudents } = await supabase
            .from('college_info')
            .select('user_id')
            .eq('college_id', collegeInfo.college_id)

          const collegeStudentIds = new Set(
            collegeStudents?.map((c: any) => c.user_id) || []
          )

          const filtered = studentsData.filter((s) =>
            collegeStudentIds.has(s.id)
          )
          setCollegeStudents(filtered)
        }
      }

      setLoading(false)
    }

    init()
  }, [id, router])

  const handleInvite = async () => {
    if (!selectedStudent || !team) {
      setMessage({ type: 'error', text: 'Select a student to invite' })
      return
    }

    setInviting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: team.id,
          user_id: selectedStudent,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation sent!' })
        setSelectedStudent('')
        // Refresh page
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send invitation' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setInviting(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction || !userId) return

    try {
      const { action, memberId, teamId } = confirmAction
      const response = await fetch('/api/teams/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          action: action === 'delete' ? 'delete-team' : action === 'kick' ? 'kick-member' : 'leave-team',
          team_id: team?.id,
          user_id: action === 'kick' ? memberId : action === 'leave' ? userId : undefined,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: action === 'delete' ? 'Team deleted' : action === 'kick' ? 'Member removed' : 'Left team',
        })
        setConfirmAction(null)
        setTimeout(() => router.push('/teams'), 1500)
      } else {
        setMessage({ type: 'error', text: result.error || 'Action failed' })
        setConfirmAction(null)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
      setConfirmAction(null)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <div role="status" aria-label="Loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <span className="spin"><LoaderIcon size={20} /></span>
        </div>
      </main>
    )
  }

  if (!team) {
    return (
      <main style={{ padding: 24 }}>
        <p>Team not found</p>
      </main>
    )
  }

  const isTeamCreator = userId === team.created_by
  const isMember = team.members.some((m: any) => m.user_id === userId)

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>{team.name}</h1>

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

      {team.description && (
        <p style={{ color: '#6b7280', marginBottom: 16 }}>{team.description}</p>
      )}

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
        <p style={{ margin: 0 }}>
          <strong>{team.members.length}</strong> / <strong>{team.max_members}</strong> members
        </p>
      </div>

      {/* Members List */}
      <section style={{ marginBottom: 32 }}>
        <h2>Team Members</h2>
        {team.members.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No members yet</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {team.members.map((member: any) => (
              <li
                key={member.user_id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{member.profiles.first_name} {member.profiles.last_name}</strong>
                  {member.user_id === team.created_by && (
                    <span style={{ marginLeft: 8, color: '#059669', fontSize: 12 }}>
                      (Creator)
                    </span>
                  )}
                </div>
                {isTeamCreator && member.user_id !== userId && (
                  <button
                    onClick={() =>
                      setConfirmAction({ action: 'kick', memberId: member.user_id })
                    }
                    className="icon-only"
                    aria-label="Remove member"
                    title="Remove member"
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <UserMinusIcon size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite Section (only for creator) */}
      {isTeamCreator && team.members.length < team.max_members && (
        <section style={{ marginBottom: 32 }}>
          <h2>Invite Students</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 4,
              }}
            >
              <option value="">Select a student...</option>
              {collegStudents
                .filter(
                  (s) =>
                    !team.members.some((m: any) => m.user_id === s.id) &&
                    s.id !== userId
                )
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !selectedStudent}
              className="icon-only"
              aria-label={inviting ? 'Inviting...' : 'Invite'}
              title={inviting ? 'Inviting...' : 'Invite'}
            >
              {inviting ? <span className="spin"><LoaderIcon size={16} /></span> : <UserPlusIcon size={16} />}
            </button>
          </div>
        </section>
      )}

      {/* Back Button */}
      <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
        {isMember && !isTeamCreator && (
          <button
            onClick={() => setConfirmAction({ action: 'leave' })}
            className="icon-only"
            aria-label="Leave Team"
            title="Leave Team"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <LogOutIcon size={16} />
          </button>
        )}
        {isTeamCreator && (
          <button
            onClick={() => setConfirmAction({ action: 'delete' })}
            className="icon-only"
            aria-label="Delete Team"
            title="Delete Team"
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: 32,
              borderRadius: 8,
              maxWidth: 400,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {confirmAction.action === 'delete'
                ? 'Delete Team?'
                : confirmAction.action === 'leave'
                  ? 'Leave Team?'
                  : 'Remove Member?'}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              {confirmAction.action === 'delete'
                ? 'This action cannot be undone. All team data will be permanently deleted.'
                : confirmAction.action === 'leave'
                  ? 'Are you sure you want to leave this team?'
                  : 'This member will be removed from the team.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmAction(null)}
                className="icon-only"
                aria-label="Cancel"
                title="Cancel"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <XIcon size={16} />
              </button>
              <button
                onClick={handleConfirmAction}
                className="icon-only"
                aria-label={confirmAction.action === 'delete' ? 'Delete' : confirmAction.action === 'leave' ? 'Leave' : 'Remove'}
                title={confirmAction.action === 'delete' ? 'Delete' : confirmAction.action === 'leave' ? 'Leave' : 'Remove'}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor:
                    confirmAction.action === 'delete' ? '#dc2626' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {confirmAction.action === 'delete' ? <TrashIcon size={16} /> : confirmAction.action === 'leave' ? <LogOutIcon size={16} /> : <UserMinusIcon size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
