import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get invitations for a user
    try {
      const { user_id } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id required' })
      }

      const { data, error } = await supabaseServer
        .from('team_members')
        .select(
          `
          id,
          status,
          invited_at,
          teams (
            id,
            name,
            description,
            college_id,
            created_by,
            colleges (
              name
            )
          )
        `
        )
        .eq('user_id', user_id)
        .eq('status', 'pending')

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ invitations: data || [] })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Accept/decline invitation
    try {
      const { team_member_id, action } = req.body

      if (!team_member_id || !['accept', 'decline'].includes(action)) {
        return res
          .status(400)
          .json({ error: 'team_member_id and action (accept/decline) required' })
      }

      const status = action === 'accept' ? 'accepted' : 'declined'

      const { data, error } = await supabaseServer
        .from('team_members')
        .update({
          status,
          accepted_at: action === 'accept' ? new Date().toISOString() : null,
        })
        .eq('id', team_member_id)
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ result: data })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
