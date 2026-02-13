import '../styles/globals.css'
import '../styles/chat.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { initializeOneSignal } from '../lib/onesignalClient'
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
        <title>RisingNetwork.in - Professional College Networking Platform</title>
        <meta name="description" content="Connect with college students, join teams, schedule meetings, and build your professional network on RisingNetwork.in - India's leading college networking platform." />
        <meta name="keywords" content="college networking India, student connections, team collaboration, professional networking, campus network, rising network, Indian colleges" />
        <meta name="author" content="RisingNetwork.in" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="RisingNetwork.in - Professional College Networking" />
        <meta property="og:description" content="Join India's leading college networking platform for students and professionals." />
        <meta property="og:image" content="https://risingnetwork.in/og-image.jpg" />
        <meta property="og:url" content="https://risingnetwork.in" />
        <meta property="og:site_name" content="RisingNetwork.in" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="RisingNetwork.in - Professional College Networking" />
        <meta name="twitter:description" content="Join India's leading college networking platform for students." />
        <meta name="twitter:image" content="https://risingnetwork.in/twitter-image.jpg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://risingnetwork.in" />
        
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
