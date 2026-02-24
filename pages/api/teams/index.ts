import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get teams by college
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { college_id } = req.query

      if (!college_id) {
        return res.status(400).json({ error: 'college_id required' })
      }

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data, error } = await supabaseUser
        .from('teams')
        .select('*')
        .eq('college_id', college_id)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      const teamIds = (data || []).map((team: any) => team.id)
      let memberCounts = new Map<string, number>()
      if (teamIds.length > 0) {
        const { data: memberRows } = await supabaseUser
          .from('team_members')
          .select('team_id, status')
          .in('team_id', teamIds)
          .eq('status', 'accepted')

        ;(memberRows || []).forEach((row: any) => {
          const key = String(row.team_id)
          memberCounts.set(key, (memberCounts.get(key) || 0) + 1)
        })
      }

      const transformed = (data || []).map((team: any) => ({
        ...team,
        max_members: team.max_members || null,
        member_count: memberCounts.get(String(team.id)) || 0,
      }))

      return res.status(200).json({ teams: transformed })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Create a team
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { name, college_id } = req.body

      if (!name || !college_id) {
        return res
          .status(400)
          .json({ error: 'name and college_id required' })
      }

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data: team, error: teamError } = await supabaseUser
        .from('teams')
        .insert({
          name,
          college_id,
          created_by: user.id,
          max_members: 9999,
        })
        .select()
        .single()

      if (teamError) {
        return res.status(500).json({ error: teamError.message })
      }

      // Add creator as accepted member
      const { error: memberError } = await (supabaseUser as any)
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          status: 'accepted',
          invited_by: user.id,
        })

      // Ignore duplicate membership inserts, but fail for other errors.
      if (memberError && memberError.code !== '23505') {
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
