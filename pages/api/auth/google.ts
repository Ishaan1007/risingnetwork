import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Redirect to Google OAuth consent screen
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    const scope = encodeURIComponent('https://www.googleapis.com/auth/meetings.space.create')
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId || '')}&` +
      `redirect_uri=${encodeURIComponent(redirectUri || '')}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `access_type=offline&` +
      `prompt=consent`

    res.redirect(authUrl)
  } else if (req.method === 'POST') {
    try {
      const { code } = req.body
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code required' })
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        }).toString(),
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        return res.status(400).json({ error: 'Failed to exchange authorization code' })
      }

      // Store tokens securely (in production, store in database)
      // Avoid returning tokens to the client from this endpoint.
      res.status(200).json({
        message: 'Authentication successful'
      })
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
