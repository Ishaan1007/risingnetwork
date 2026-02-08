import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'DELETE') {
    // Delete team (creator only) or kick member or leave team
    try {
      const { action, team_id, user_id } = req.body

      if (!action || !team_id) {
        return res.status(400).json({ error: 'action and team_id required' })
      }

      if (action === 'delete-team') {
        // Only creator can delete team
        const { data: team, error: teamError } = await supabaseServer
          .from('teams')
          .select('created_by')
          .eq('id', team_id)
          .single()

        if (teamError || !team) {
          return res.status(404).json({ error: 'Team not found' })
        }

        if (team.created_by !== user_id) {
          return res.status(403).json({ error: 'Only team creator can delete' })
        }

        // Delete all team members
        await supabaseServer.from('team_members').delete().eq('team_id', team_id)

        // Delete team
        const { error: deleteError } = await supabaseServer
          .from('teams')
          .delete()
          .eq('id', team_id)

        if (deleteError) {
          return res.status(500).json({ error: deleteError.message })
        }

        return res.status(200).json({ message: 'Team deleted' })
      } else if (action === 'kick-member') {
        // Only creator can kick members
        if (!user_id) {
          return res.status(400).json({ error: 'user_id required for kick' })
        }

        const { data: team, error: teamError } = await supabaseServer
          .from('teams')
          .select('created_by')
          .eq('id', team_id)
          .single()

        if (teamError || !team) {
          return res.status(404).json({ error: 'Team not found' })
        }

        if (team.created_by !== user_id) {
          return res.status(403).json({ error: 'Only team creator can kick members' })
        }

        // Remove member
        const { error: removeError } = await supabaseServer
          .from('team_members')
          .delete()
          .eq('team_id', team_id)
          .eq('user_id', user_id)

        if (removeError) {
          return res.status(500).json({ error: removeError.message })
        }

        return res.status(200).json({ message: 'Member removed' })
      } else if (action === 'leave-team') {
        // Any member can leave
        const { error: removeError } = await supabaseServer
          .from('team_members')
          .delete()
          .eq('team_id', team_id)
          .eq('user_id', user_id)

        if (removeError) {
          return res.status(500).json({ error: removeError.message })
        }

        return res.status(200).json({ message: 'Left team' })
      } else {
        return res.status(400).json({ error: 'Invalid action' })
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
