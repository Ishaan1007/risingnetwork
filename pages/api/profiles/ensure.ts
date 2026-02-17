import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!user.email) {
      return res.status(400).json({ error: 'Email is required to create profile' })
    }

    const token = req.headers.authorization?.slice(7) || ''
    const supabaseUser = getSupabaseUserClient(token)
    const inferredName =
      (user.user_metadata?.name as string | undefined) ||
      [user.user_metadata?.given_name, user.user_metadata?.family_name].filter(Boolean).join(' ')

    // Check if profile already exists
    const { data: existing } = await supabaseUser
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      return res.status(200).json({ profile: existing, created: false })
    }

    // Create profile with defaults
    const { data: newProfile, error } = await supabaseUser
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: inferredName || '',
        city: '',
        role: null,
        bio: '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return res
        .status(500)
        .json({ error: `Failed to create profile: ${error.message}` })
    }

    return res.status(200).json({ profile: newProfile, created: true })
  } catch (error: any) {
    console.error('Handler error:', error)
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error' })
  }
}

