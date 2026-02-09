import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import {
  LogInIcon,
  LogOutIcon,
  ProfileIcon,
  SearchIcon,
  UserPlusIcon,
} from './Icons'

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [searchInput, setSearchInput] = useState('')
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)

      if (session?.user) {
        fetch('/api/profiles/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
          }),
        }).catch((error) => console.warn('Failed to ensure profile:', error))
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess?.user) {
        fetch('/api/profiles/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: sess.user.id,
            email: sess.user.email,
          }),
        }).catch((error) => console.warn('Failed to ensure profile:', error))
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (router.pathname !== '/search') return
    const q = router.query.q
    if (typeof q === 'string') {
      setSearchInput(q)
    }
  }, [router.pathname, router.query.q])

  useEffect(() => {
    let isMounted = true

    const checkProfile = async () => {
      if (!session?.user) {
        if (isMounted) setProfileIncomplete(false)
        return
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('avatar_url, bio, linkedin_url, github_url, portfolio_url, role, city')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profileData) {
          if (isMounted) setProfileIncomplete(false)
          return
        }

        let incomplete = false

        if (!profileData.avatar_url) incomplete = true
        if (!profileData.bio || profileData.bio.trim() === '') incomplete = true
        if (!profileData.linkedin_url) incomplete = true
        if (!profileData.github_url) incomplete = true
        if (!profileData.portfolio_url) incomplete = true
        if (!profileData.role) incomplete = true
        if (!profileData.city || profileData.city.trim() === '') incomplete = true

        const { data: skillsData } = await supabase
          .from('user_skills')
          .select('skill_id')
          .eq('user_id', session.user.id)

        if (!skillsData || skillsData.length === 0) incomplete = true

        if (profileData.role === 'student') {
          const { data: collegeData } = await supabase
            .from('college_info')
            .select('college_id')
            .eq('user_id', session.user.id)
            .single()

          if (!collegeData?.college_id) incomplete = true
        }

        if (isMounted) setProfileIncomplete(incomplete)
      } catch (error) {
        if (isMounted) setProfileIncomplete(false)
      }
    }

    checkProfile()

    return () => {
      isMounted = false
    }
  }, [session])

  const handleSearch = () => {
    const val = searchInput.trim()
    if (val) {
      router.push(`/search?q=${encodeURIComponent(val)}`)
      return
    }
    router.push('/explore')
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) console.error('OAuth error', error)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const isActive = (path: string) => {
    if (path === '/explore') {
      return router.pathname === '/explore' || router.pathname === '/'
    }
    return router.pathname === path
  }

  return (
    <div className="rn-page">
      <header className="rn-topbar">
        <div className="rn-logo" role="button" onClick={() => router.push('/')}>
          <svg className="rn-logo-mark" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          RisingNetwork
        </div>
        <div className="rn-search">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Search skills, people, or city..."
            aria-label="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
          />
          <button className="rn-search-btn" type="button" onClick={handleSearch}>
            Explore
          </button>
        </div>
        <nav className="rn-nav">
          <button
            className={`rn-nav-btn ${isActive('/explore') ? 'is-active' : ''}`}
            type="button"
            onClick={() => router.push('/explore')}
          >
            <SearchIcon size={20} />
            <span>Explore</span>
          </button>
          {!session ? (
            <>
              <button
                className="rn-nav-btn is-locked"
                type="button"
                onClick={() => alert('Please log in to view your Profile.')}
              >
                <span className="rn-nav-icon">
                  <ProfileIcon size={20} />
                </span>
                <span>Profile</span>
              </button>
              <button className="rn-nav-btn" type="button" onClick={handleSignIn}>
                <LogInIcon size={20} />
                <span>Log In</span>
              </button>
            </>
          ) : (
            <>
              <button
                className={`rn-nav-btn ${isActive('/connections') ? 'is-active' : ''}`}
                type="button"
                onClick={() => router.push('/connections')}
              >
                <UserPlusIcon size={20} />
                <span>Connections</span>
              </button>
              <button
                className={`rn-nav-btn ${isActive('/profile') ? 'is-active' : ''}`}
                type="button"
                onClick={() => router.push('/profile')}
              >
                <span className="rn-nav-icon">
                  <ProfileIcon size={20} />
                  {profileIncomplete && <span className="rn-dot" aria-hidden="true" />}
                </span>
                <span>Profile</span>
              </button>
              <button className="rn-nav-btn" type="button" onClick={handleSignOut}>
                <LogOutIcon size={20} />
                <span>Logout</span>
              </button>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  )
}
