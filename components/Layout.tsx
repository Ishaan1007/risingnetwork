import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getInitialSession, signInWithGoogle } from '../lib/auth'
import {
  LogInIcon,
  LogOutIcon,
  ProfileIcon,
  SearchIcon,
  SearchButtonIcon,
  TeamsIcon,
} from './Icons'

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  useEffect(() => {
    let mounted = true

    const ensureProfile = async (accessToken: string) => {
      let attempt = 0
      while (attempt < 3) {
        try {
          await fetch('/api/profiles/ensure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          })
          return
        } catch (_error) {
          attempt += 1
          if (attempt >= 3) return
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
        }
      }
    }

    const getSession = async () => {
      try {
        const { session, timedOut, error } = await getInitialSession(supabase)
        if (!mounted) return

        if (timedOut) {
          console.warn('Initial auth session check timed out; continuing without blocking UI.')
        } else if (error) {
          console.error('Initial auth session check failed:', error)
        }

        setSession(session)

        if (session?.user) {
          void ensureProfile(session.access_token)
        }
      } finally {
        if (mounted) setAuthReady(true)
      }
    }

    void getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return
      setSession(sess)
      setAuthReady(true)
      if (sess?.user) {
        void ensureProfile(sess.access_token)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
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
          .select('name')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profileData) {
          if (isMounted) setProfileIncomplete(false)
          return
        }

        let incomplete = false
        if (!profileData.name || profileData.name.trim() === '') incomplete = true

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

  useEffect(() => {
    if (!session?.user) return
    if (!profileIncomplete) return
    if (router.pathname === '/profile') return
    router.push('/profile?reason=name')
  }, [session, profileIncomplete, router])

  const handleSearch = () => {
    const val = searchInput.trim()
    if (val) {
      router.push(`/search?q=${encodeURIComponent(val)}`)
      return
    }
    router.push('/explore')
  }

  const handleSignIn = async () => {
    const { error } = await signInWithGoogle(supabase)
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
    if (path === '/messages') {
      return router.pathname === '/messages' || router.pathname.startsWith('/messages/')
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
          {searchInput.trim().length > 0 && (
            <button 
              className="rn-search-btn" 
              type="button" 
              onClick={handleSearch}
              aria-label="Search"
            >
              <SearchButtonIcon size={16} />
            </button>
          )}
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
          {!authReady ? (
            <button className="rn-nav-btn" type="button" disabled>
              <span>Checking session...</span>
            </button>
          ) : !session ? (
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
                className={`rn-nav-btn ${isActive('/messages') ? 'is-active' : ''}`}
                type="button"
                onClick={() => router.push('/messages')}
              >
                <span className="material-symbols-outlined rn-msg-symbol" aria-hidden="true">
                  3p
                </span>
                <span>Messages</span>
              </button>
              <button
                className={`rn-nav-btn ${isActive('/teams') ? 'is-active' : ''}`}
                type="button"
                onClick={() => router.push('/teams')}
              >
                <TeamsIcon size={20} />
                <span>Teams</span>
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
