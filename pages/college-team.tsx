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

type College = {
  id: number
  name: string
  city: string
}

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string
  bio: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  avatar_url?: string
  college: College | null
  major?: string
  graduation_year?: number
  skills: Skill[]
}

const LIMIT = 12

export default function BuildCollegeTeam() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [allColleges, setAllColleges] = useState<College[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [selectedCollege, setSelectedCollege] = useState<string>('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])

  // Fetch available colleges and skills
  useEffect(() => {
    const init = async () => {
      // Fetch all colleges
      const { data: collegesData } = await supabase
        .from('colleges')
        .select('id, name, city')
        .order('name')

      if (collegesData) {
        setAllColleges(collegesData)
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

  // Fetch students based on filters
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedCollege) params.append('college', selectedCollege)
        if (selectedSkillIds.length > 0) {
          params.append('skills', selectedSkillIds.join(','))
        }
        params.append('limit', LIMIT.toString())
        params.append('offset', (page * LIMIT).toString())

        const response = await fetch(`/api/students?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setStudents(result.data)
          setTotalCount(result.total)
        } else {
          console.error('Fetch error:', result.error)
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedCollege, selectedSkillIds, page])

  const handleSkillToggle = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    )
    setPage(0)
  }

  const handleCollegeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCollege(e.target.value)
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / LIMIT)

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Build College Team</h1>

      {/* Filters */}
      <section style={{ marginBottom: 32, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 16 }}>Filters</h2>

        {/* College Filter */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="college" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            College
          </label>
          <select
            id="college"
            value={selectedCollege}
            onChange={handleCollegeChange}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #d1d5db',
              borderRadius: 4,
            }}
          >
            <option value="">All colleges</option>
            {allColleges.map((college) => (
              <option key={college.id} value={college.id.toString()}>
                {college.name} ({college.city})
              </option>
            ))}
          </select>
        </div>

        {/* Skills Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Skills</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            {allSkills.map((skill) => (
              <label
                key={skill.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: 8,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  cursor: 'pointer',
                  backgroundColor: selectedSkillIds.includes(skill.id) ? '#eff6ff' : 'white',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSkillIds.includes(skill.id)}
                  onChange={() => handleSkillToggle(skill.id)}
                />
                <span style={{ fontSize: 14 }}>
                  {skill.name}
                  {skill.category && <span style={{ color: '#6b7280' }}> ({skill.category})</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>
          Results ({totalCount} student{totalCount !== 1 ? 's' : ''})
        </h2>

        {loading ? (
          <div role="status" aria-label="Loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <span className="spin"><LoaderIcon size={20} /></span>
          </div>
        ) : students.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No students found matching your filters.</p>
        ) : (
          <>
            {/* Student Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
                marginBottom: 32,
              }}
            >
              {students.map((student) => (
                <div
                  key={student.id}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: 'white',
                  }}
                >
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar src={student.avatar_url} alt="avatar" size={44} />
                      <div>
                        {student.first_name} {student.last_name}
                      </div>
                    </div>
                  </h3>

                  {/* College Info */}
                  {student.college && (
                    <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: 14 }}>
                      <strong>{student.college.name}</strong>
                      {student.major && ` • ${student.major}`}
                      {student.graduation_year && ` • Class of ${student.graduation_year}`}
                    </p>
                  )}

                  {student.bio && (
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 14,
                        color: '#374151',
                        lineHeight: 1.5,
                      }}
                    >
                      {student.bio}
                    </p>
                  )}

                  {/* Skills */}
                  {student.skills.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {student.skills.map((skill) => (
                          <span
                            key={skill.id}
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact Links */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#059669',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        Email
                      </a>
                    )}
                    {student.linkedin_url && (
                      <a
                        href={student.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#0a66c2',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        LinkedIn
                      </a>
                    )}
                    {student.github_url && (
                      <a
                        href={student.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#333',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        GitHub
                      </a>
                    )}
                    {student.portfolio_url && (
                      <a
                        href={student.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  title="Previous"
                  style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeftIcon size={18} />
                </button>
                <span aria-label={`Page ${page + 1} of ${totalPages}`}>{page + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                  title="Next"
                  style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRightIcon size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

    </main>
  )
}
