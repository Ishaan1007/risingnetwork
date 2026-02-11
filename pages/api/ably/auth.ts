import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'
import * as Ably from 'ably'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { clientId, capability } = req.body

    // Validate clientId matches the authenticated user
    if (clientId !== session.user.id) {
      return res.status(403).json({ error: 'Invalid client ID' })
    }

    // Get Ably API key from environment
    const apiKey = process.env.ABLY_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Ably API key not configured' })
    }

    // Create Ably REST client
    const ablyRest = new Ably.Rest(apiKey)

    // Generate token request
    const tokenRequest = {
      clientId: session.user.id,
      capability: capability || {
        // Default capabilities for authenticated users
        'team:*': ['subscribe', 'publish', 'presence'],
        'meeting:*': ['subscribe', 'publish', 'presence'],
        'user:*': ['subscribe', 'publish'],
        'connection:*': ['subscribe', 'publish'],
        'global:*': ['subscribe']
      },
      ttl: 3600000, // 1 hour
      data: {
        userId: session.user.id,
        userName: session.user.user_metadata?.first_name || 'User',
        userEmail: session.user.email
      }
    }

    // Generate token
    const tokenDetails = await ablyRest.auth.createTokenRequest(tokenRequest)

    return res.status(200).json({
      tokenRequest: tokenDetails,
      apiKey: process.env.ABLY_API_KEY
    })

  } catch (error) {
    console.error('Ably auth error:', error)
    return res.status(500).json({ error: 'Failed to generate token' })
  }
}
