import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { initializeOneSignal } from '../lib/onesignal'
import Layout from '../components/Layout'

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize OneSignal when app loads
    const initOneSignal = async () => {
      // Use your actual OneSignal App ID here
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'your-onesignal-app-id'
      await initializeOneSignal(appId)
    }

    initOneSignal()
  }, [])

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default App
