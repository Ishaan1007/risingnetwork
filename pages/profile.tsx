import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { LoaderIcon } from '../components/Icons'
import Avatar from '../components/Avatar'
import { syncProfilePicture } from '../lib/gravatar'
import { subscribeToNotifications, getOneSignalPlayerId } from '../lib/onesignal'

type Profile = {
  id: string
  first_name: string
  last_name: string
  city: string
  role?: 'student' | 'freelancer' | 'teacher' | null
  bio: string
  linkedin_url?: string | null
  github_url?: string | null
  portfolio_url?: string | null
  avatar_url?: string | null
}

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

type CollegeInfo = {
  college_id: number | null
  major: string
  graduation_year: number | null
  semester: number | null
}

export default function Profile() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [allColleges, setAllColleges] = useState<College[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [collegeInfo, setCollegeInfo] = useState<CollegeInfo>({
    college_id: null,
    major: '',
    graduation_year: null,
    semester: null,
  })
  const [hasStartedTyping, setHasStartedTyping] = useState(false)
  const [syncingAvatar, setSyncingAvatar] = useState(false)
  const [universityQuery, setUniversityQuery] = useState('')
  const [skillQuery, setSkillQuery] = useState('')
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch session and profile data
  useEffect(() => {
    const init = async (userId: string) => {
      try {
        // Fetch profile - no RLS, so this should work
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('profile fetch error', profileError)
          setMessage({ type: 'error', text: 'Failed to load profile' })
          setLoading(false)
        }

        // Fetch skills
        const { data: skillsData } = await supabase
          .from('skills')
          .select('*')
          .order('name')

        if (skillsData) {
          setAllSkills(skillsData)
        }

        // Fetch colleges
        const { data: collegesData } = await supabase
          .from('colleges')
          .select('*')
          .order('name')

        if (collegesData) {
          setAllColleges(collegesData)
        }

        // Fetch user's skills and college info
        const { data: userSkills } = await supabase
          .from('user_skills')
          .select('skill_id')
          .eq('user_id', userId)

        if (userSkills) {
          setSelectedSkillIds(userSkills.map((us: any) => us.skill_id))
        }

        const { data: userCollegeInfo } = await supabase
          .from('college_info')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (userCollegeInfo) {
          setCollegeInfo({
            college_id: userCollegeInfo.college_id,
            major: userCollegeInfo.major || '',
            graduation_year: userCollegeInfo.graduation_year,
            semester: userCollegeInfo.semester,
          })
        }

        setLoading(false)
      } catch (error) {
        console.error('init error', error)
        setMessage({ type: 'error', text: 'An error occurred' })
        setLoading(false)
      }
    }

    // Use onAuthStateChange for reliability
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/')
        return
      }

      setUserId(session.user.id)
      init(session.user.id)
    })

    return () => subscription?.unsubscribe()
  }, [router])

  const handleProfileChange = (field: keyof Profile, value: string | null | undefined) => {
  setProfile((prev) => {
    if (!prev) return null
    const updated = { ...prev, [field]: value }
    
    // Track if user has started typing their name
    if (field === 'first_name' && value && value.trim().length > 0) {
      setHasStartedTyping(true)
    }
    
    return updated
  })
}

  const handleSkillToggle = useCallback((skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    )
  }, [])

  const handleSyncAvatar = async () => {
    if (!userId) return
    
    setSyncingAvatar(true)
    setMessage(null)
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No user session')
      
      // Sync profile picture
      const profilePicture = syncProfilePicture(session.user)
      
      if (profilePicture) {
        // Update profile with new avatar
        const { error } = await supabase
          .from('profiles')
          .update({ 
            avatar_url: profilePicture,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        if (error) throw error
        
        // Update local state
        setProfile(prev => prev ? { ...prev, avatar_url: profilePicture } : null)
        setAvatarPreview(profilePicture)
        
        setMessage({ type: 'success', text: 'Profile picture synced successfully!' })
      } else {
        setMessage({ type: 'error', text: 'No profile picture available to sync.' })
      }
    } catch (error) {
      console.error('Error syncing avatar:', error)
      setMessage({ type: 'error', text: 'Failed to sync profile picture.' })
    } finally {
      setSyncingAvatar(false)
    }
  }

  const filteredColleges = allColleges.filter((c) => {
    const query = universityQuery.trim().toLowerCase()
    if (!query) return true
    return `${c.name} ${c.city}`.toLowerCase().includes(query)
  })

  useEffect(() => {
    const query = universityQuery.trim().toLowerCase()
    if (!query) return
    if (filteredColleges.length === 1) {
      const only = filteredColleges[0]
      if (only && only.id !== collegeInfo.college_id) {
        setCollegeInfo({ ...collegeInfo, college_id: only.id })
        handleProfileChange('city', only.city)
      }
    }
  }, [universityQuery, filteredColleges, collegeInfo, handleProfileChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !userId) return
    if (!profile.first_name?.trim()) {
      setMessage({ type: 'error', text: 'First name is required.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Update profile
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          city: profile.city,
          role: profile.role,
          bio: profile.bio,
          linkedin_url: profile.linkedin_url || null,
          github_url: profile.github_url || null,
          portfolio_url: profile.portfolio_url || null,
          avatar_url: profile.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (profileUpdateError) {
        throw profileUpdateError
      }

      // Delete old user_skills
      const { error: deleteError } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        throw deleteError
      }

      // Insert new user_skills (upsert to avoid duplicate key errors)
      if (selectedSkillIds.length > 0) {
        const skillRecords = selectedSkillIds.map((skillId) => ({
          user_id: userId,
          skill_id: skillId,
        }))

        const { error: insertError } = await supabase
          .from('user_skills')
          .upsert(skillRecords, { onConflict: 'user_id,skill_id' })

        if (insertError) {
          throw insertError
        }
      }

      // Upsert college info (only if role is student and college_id selected)
      if (profile.role === 'student' && collegeInfo.college_id) {
        const { error: collegeError } = await supabase
          .from('college_info')
          .upsert({
            user_id: userId,
            college_id: collegeInfo.college_id,
            major: collegeInfo.major || null,
            graduation_year: collegeInfo.graduation_year || null,
            semester: collegeInfo.semester || null,
          }, { onConflict: 'user_id' })

        if (collegeError) {
          throw collegeError
        }
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('save error', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save profile. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !userId) return
    const file = files[0]
    const maxBytes = 2 * 1024 * 1024
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a JPEG, PNG, or WebP image.' })
      return
    }
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      setMessage({ type: 'error', text: 'Cloudinary is not configured.' })
      return
    }
    setUploading(true)
    setMessage(null)
    let uploadFile = file
    try {
      uploadFile = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      })
    } catch (err) {
      console.warn('image compression failed, using original file', err)
    }
    if (uploadFile.size > maxBytes) {
      setUploading(false)
      setMessage({ type: 'error', text: 'Image must be 2MB or smaller.' })
      return
    }
    const localUrl = URL.createObjectURL(uploadFile)
    setAvatarPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return localUrl
    })

    const attemptUpload = async () => {
      try {
        const publicId = `${userId}-${Date.now()}`
        const signRes = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: publicId }),
        })
        const signData = await signRes.json()
        if (!signRes.ok) {
          throw new Error(signData?.error || 'Failed to sign upload')
        }

        const form = new FormData()
        form.append('file', uploadFile)
        form.append('api_key', signData.apiKey)
        form.append('timestamp', String(signData.timestamp))
        form.append('signature', signData.signature)
        form.append('folder', signData.folder)
        form.append('public_id', signData.publicId)

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
          { method: 'POST', body: form }
        )
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          throw new Error(uploadData?.error?.message || 'Upload failed')
        }

        const publicUrl = uploadData.secure_url || uploadData.url || null

        // Update profile immediately with avatar_url
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId)

        if (profileErr) throw profileErr

        setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p))
        setAvatarPreview((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
          return publicUrl
        })
        setMessage({ type: 'success', text: 'Avatar uploaded.' })
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } catch (err: any) {
        console.error('upload error', err)
        setMessage({ type: 'error', text: err.message || 'Upload failed' })
      }
    }

    try {
      await attemptUpload()
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <main className="rn-shell">
        <div role="status" aria-label="Loading profile" className="rn-loading">
          <span className="spin">
            <LoaderIcon size={20} />
          </span>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="rn-shell">
        <div className="rn-empty">
          <p>Profile not found. Please log in.</p>
          <button onClick={() => router.push('/')} className="rn-primary-btn" style={{ marginTop: 12 }}>
            Go back
          </button>
        </div>
      </main>
    )
  }

  const filteredSkills = allSkills.filter((s) => {
    const query = skillQuery.trim().toLowerCase()
    if (!query) return true
    return `${s.name} ${s.category || ''}`.toLowerCase().includes(query)
  })

  return (
    <main className="rn-profile-shell">
      <div className="rn-profile-card">
        <div className="rn-profile-edit-header">
          <h1 className="rn-profile-title">Edit Profile</h1>
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="rn-primary-btn rn-mobile-save-btn rn-save-btn"
          >
            {saving ? (
              <span className="spin"><LoaderIcon size={16} /></span>
            ) : (
              'Save'
            )}
          </button>
        </div>

        {router.query.reason === 'name' && !hasStartedTyping && (
          <div className="rn-message error">
            Please fill in your name to continue.
          </div>
        )}

        {message && (
          <div className={`rn-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="rn-profile-row">
          <Avatar src={avatarPreview || profile.avatar_url} alt="avatar" size={84} />
          <div>
            <strong>Profile Photo</strong>
            <p>Image editing not available in this demo</p>
            <div style={{ marginTop: 8 }}>
              <input
                ref={fileInputRef}
                id="avatarUpload"
                className="rn-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
              <button
                type="button"
                className="rn-primary-btn rn-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              {uploading && (
                <small style={{ color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <span className="spin"><LoaderIcon size={14} /></span>
                </small>
              )}
              <button
                type="button"
                className="rn-secondary-btn"
                onClick={handleSyncAvatar}
                disabled={syncingAvatar}
                style={{ marginLeft: 8 }}
              >
                {syncingAvatar ? (
                  <>
                    <span className="spin"><LoaderIcon size={14} /></span>
                    Syncing...
                  </>
                ) : (
                  'Sync from Google'
                )}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rn-form" id="profile-form">
          <div className="rn-form-field">
            <label htmlFor="firstName">First Name *</label>
            <input
              id="firstName"
              type="text"
              value={profile.first_name || ''}
              onChange={(e) => handleProfileChange('first_name', e.target.value)}
            />
          </div>

          <div className="rn-form-field">
            <label htmlFor="city">City *</label>
            <input
              id="city"
              type="text"
              value={profile.city || ''}
              onChange={(e) => handleProfileChange('city', e.target.value)}
              disabled={profile.role === 'student'}
            />
          </div>

          <div className="rn-form-field">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              value={profile.role || ''}
              onChange={(e) => handleProfileChange('role', e.target.value || null)}
            >
              <option value="">Select a role</option>
              <option value="student">Student</option>
              <option value="freelancer">Freelancer</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {profile.role === 'student' && (
            <>
              <div className="rn-form-field full">
                <label htmlFor="college">University *</label>
                <input
                  type="text"
                  placeholder="Search university by name or city"
                  value={universityQuery}
                  onChange={(e) => setUniversityQuery(e.target.value)}
                />
                <select
                  id="college"
                  value={collegeInfo.college_id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value ? parseInt(e.target.value) : null
                    setCollegeInfo({ ...collegeInfo, college_id: selectedId })
                    const selectedCollege = allColleges.find((c) => c.id === selectedId)
                    if (selectedCollege) {
                      handleProfileChange('city', selectedCollege.city)
                    }
                  }}
                >
                  <option value="">Select your university</option>
                  {filteredColleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rn-form-field">
                <label htmlFor="major">Major / Field of Study</label>
                <input
                  id="major"
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={collegeInfo.major}
                  onChange={(e) => setCollegeInfo({ ...collegeInfo, major: e.target.value })}
                />
              </div>

              <div className="rn-form-field">
                <label htmlFor="graduation">Expected Graduation Year</label>
                <input
                  id="graduation"
                  type="number"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 10}
                  placeholder={String(new Date().getFullYear())}
                  value={collegeInfo.graduation_year || ''}
                  onChange={(e) => setCollegeInfo({ ...collegeInfo, graduation_year: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>

              <div className="rn-form-field">
                <label htmlFor="semester">Semester</label>
                <select
                  id="semester"
                  value={collegeInfo.semester || ''}
                  onChange={(e) =>
                    setCollegeInfo({
                      ...collegeInfo,
                      semester: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Select semester</option>
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const value = idx + 1
                    return (
                      <option key={`semester-${value}`} value={value}>
                        Semester {value}
                      </option>
                    )
                  })}
                </select>
              </div>
            </>
          )}

          <div className="rn-form-field full">
            <label htmlFor="bio">Bio *</label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
            />
          </div>

          <div className="rn-form-field full">
            <label>Skills *</label>
            <div className="rn-skill-select">
              <input
                className="rn-skill-search"
                type="text"
                placeholder="Search and select skills"
                value={skillQuery}
                onChange={(e) => {
                  setSkillQuery(e.target.value)
                  setSkillsOpen(true)
                }}
                onFocus={() => setSkillsOpen(true)}
                onBlur={() => setTimeout(() => setSkillsOpen(false), 150)}
              />

              {skillsOpen && (
                <div className="rn-skill-dropdown" role="listbox">
                  {filteredSkills.length === 0 ? (
                    <div className="rn-skill-empty">No skills found.</div>
                  ) : (
                    filteredSkills.map((skill) => {
                      const checked = selectedSkillIds.includes(skill.id)
                      return (
                        <label key={skill.id} className={`rn-skill-option ${checked ? 'is-active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleSkillToggle(skill.id)}
                          />
                          <span>
                            {skill.name}
                            {skill.category ? <em>{skill.category}</em> : null}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {selectedSkillIds.length > 0 && (
              <div className="rn-skill-grid">
                {allSkills
                  .filter((skill) => selectedSkillIds.includes(skill.id))
                  .map((skill) => (
                    <span key={skill.id} className="rn-skill-chip is-active">
                      {skill.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="rn-form-field full">
            <div className="rn-divider" />
            <label style={{ marginTop: 8 }}>External Links</label>
          </div>

          <div className="rn-form-field full">
            <label htmlFor="linkedinUrl">LinkedIn</label>
            <input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={profile.linkedin_url || ''}
              onChange={(e) => handleProfileChange('linkedin_url', e.target.value || null)}
            />
          </div>

          <div className="rn-form-field full">
            <label htmlFor="githubUrl">GitHub</label>
            <input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/yourprofile"
              value={profile.github_url || ''}
              onChange={(e) => handleProfileChange('github_url', e.target.value || null)}
            />
          </div>

          <div className="rn-form-field full">
            <label htmlFor="portfolioUrl">Portfolio</label>
            <input
              id="portfolioUrl"
              type="url"
              placeholder="https://yourportfolio.com"
              value={profile.portfolio_url || ''}
              onChange={(e) => handleProfileChange('portfolio_url', e.target.value || null)}
            />
          </div>

          <div className="rn-actions">
            <button type="submit" disabled={saving} className="rn-primary-btn rn-save-btn">
              {saving ? (
                <span className="spin"><LoaderIcon size={16} /></span>
              ) : (
                'Save'
              )}
            </button>
            <button type="button" className="rn-secondary-btn" onClick={() => router.back()}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
