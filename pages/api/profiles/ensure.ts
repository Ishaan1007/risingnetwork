import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, email } = req.body

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email required' })
    }

    // Check if profile already exists
    const { data: existing } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existing) {
      return res.status(200).json({ profile: existing, created: false })
    }

    // Create profile with defaults
    const { data: newProfile, error } = await supabaseServer
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        first_name: '',
        last_name: '',
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

