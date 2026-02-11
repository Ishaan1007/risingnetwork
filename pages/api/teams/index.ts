import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get teams by college
    try {
      const { college_id } = req.query

      if (!college_id) {
        return res.status(400).json({ error: 'college_id required' })
      }

      const { data, error } = await supabaseServer
        .from('teams')
        .select(`
          id,
          name,
          max_members,
          created_by,
          created_at,
          team_members!team_members_team_id_fkey (
            id,
            user_id,
            status,
            profiles!team_members_user_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('college_id', college_id)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      const transformed = (data || []).map((team: any) => ({
        ...team,
        member_count: team.team_members.filter(
          (tm: any) => tm.status === 'accepted'
        ).length,
        members: team.team_members.filter((tm: any) => tm.status === 'accepted'),
      }))

      return res.status(200).json({ teams: transformed })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Create a team
    try {
      const { name, college_id, created_by } = req.body

      if (!name || !college_id || !created_by) {
        return res
          .status(400)
          .json({ error: 'name, college_id, created_by required' })
      }

      const { data: team, error: teamError } = await supabaseServer
        .from('teams')
        .insert({
          name,
          college_id,
          created_by,
          max_members: 5,
        })
        .select()
        .single()

      if (teamError) {
        return res.status(500).json({ error: teamError.message })
      }

      // Add creator as accepted member
      const { error: memberError } = await supabaseServer
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: created_by,
          status: 'accepted',
        })

      if (memberError) {
        return res.status(500).json({ error: memberError.message })
      }

      return res.status(201).json({ team })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
