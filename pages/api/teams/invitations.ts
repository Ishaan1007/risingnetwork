import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get pending invitations for current user
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'User ID required' })
      }

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data, error } = await supabaseUser
        .from('team_members')
        .select(`
          id,
          team_id,
          status,
          created_at,
          teams (
            id,
            name,
            created_by,
            profiles!teams_created_by_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ invitations: data || [] })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Accept or decline invitation
    try {
      const { invitation_id, action } = req.body
      const user = await getUserFromRequest(req)
      if (!invitation_id || !action || !user) {
        return res.status(400).json({ 
          error: 'invitation_id, action, and user ID required' 
        })
      }

      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' })
      }

      // Update invitation status
      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data, error } = await supabaseUser
        .from('team_members')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation_id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (!data) {
        return res.status(404).json({ error: 'Invitation not found' })
      }

      return res.status(200).json({ 
        message: `Invitation ${action}ed successfully`,
        invitation: data
      })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
