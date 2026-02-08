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
    const { team_id, user_id } = req.body

    if (!team_id || !user_id) {
      return res.status(400).json({ error: 'team_id and user_id required' })
    }

    // Check if already invited/member
    const { data: existing } = await supabaseServer
      .from('team_members')
      .select('id, status')
      .eq('team_id', team_id)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return res.status(400).json({
        error: `User is already ${existing.status} for this team`,
      })
    }

    // Create invitation
    const { data: invitation, error } = await supabaseServer
      .from('team_members')
      .insert({
        team_id,
        user_id,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ invitation })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
