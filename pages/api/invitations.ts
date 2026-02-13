import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserClient, getUserFromRequest } from '../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get invitations for a user
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data, error } = await supabaseUser
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
        .eq('user_id', user.id)
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

      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const status = action === 'accept' ? 'accepted' : 'declined'

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data, error } = await supabaseUser
        .from('team_members')
        .update({
          status,
          accepted_at: action === 'accept' ? new Date().toISOString() : null,
        })
        .eq('id', team_member_id)
        .eq('user_id', user.id)
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
