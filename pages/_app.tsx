import '../styles/globals.css'
import '../styles/chat.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { initializeOneSignal } from '../lib/onesignal'
import Layout from '../components/Layout'
import Head from 'next/head'

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize OneSignal when app loads
    const initOneSignal = async () => {
      // Use your actual OneSignal App ID here
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'your-onesignal-app-id'
      const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID
      await initializeOneSignal(appId, safariWebId)
    }

    initOneSignal()
  }, [])

  return (
    <>
      <Head>
        <title>RisingNetwork - Professional College Networking Platform</title>
        <meta name="description" content="Connect with college students, join teams, schedule meetings, and build your professional network on RisingNetwork." />
        <meta name="keywords" content="college networking, student connections, team collaboration, professional networking, campus network, rising network" />
        <meta name="author" content="RisingNetwork" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="RisingNetwork - Professional College Networking" />
        <meta property="og:description" content="Join the ultimate college networking platform for students and professionals." />
        <meta property="og:image" content="https://risingnetwork.com/og-image.jpg" />
        <meta property="og:url" content="https://risingnetwork.com" />
        <meta property="og:site_name" content="RisingNetwork" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="RisingNetwork - Professional College Networking" />
        <meta name="twitter:description" content="Join the ultimate college networking platform for students." />
        <meta name="twitter:image" content="https://risingnetwork.com/twitter-image.jpg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://risingnetwork.com" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect to domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}

export default App
