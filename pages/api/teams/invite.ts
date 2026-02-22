import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendTeamInvitation } from '../../../lib/onesignalServer'

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

    const { team_id, user_id } = req.body

    if (!team_id || !user_id) {
      return res.status(400).json({ error: 'team_id and user_id required' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const token = req.headers.authorization?.slice(7) || ''
    const supabaseUser = getSupabaseUserClient(token)

    if (user_id === user.id) {
      return res.status(400).json({ error: 'You are already in your own team' })
    }

    const { data: team, error: teamError } = await supabaseUser
      .from('teams')
      .select('id, name, created_by')
      .eq('id', team_id)
      .single()

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    if (team.created_by !== user.id) {
      return res.status(403).json({ error: 'Only team creator can invite' })
    }

    // Check if already invited/member
    const { data: existing } = await (supabaseAdmin as any)
      .from('team_members')
      .select('id, status')
      .eq('team_id', team_id)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      const existingRow = existing as { status?: string } | null
      return res.status(400).json({
        error: `User is already ${existingRow?.status || 'added'} for this team`,
      })
    }

    // Create invitation
    const { data: invitation, error } = await (supabaseAdmin as any)
      .from('team_members')
      .insert({
        team_id,
        user_id,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Send notification to invitee
    try {
      const { data: recipient } = await supabaseAdmin
        .from('profiles')
        .select('onesignal_player_id, name')
        .eq('id', user_id)
        .single()
      const recipientProfile = recipient as { onesignal_player_id?: string | null; name?: string | null } | null

      if (recipientProfile?.onesignal_player_id) {
        await sendTeamInvitation(
          recipientProfile.onesignal_player_id,
          user.user_metadata?.name || user.user_metadata?.first_name || 'Someone',
          team.name,
          String(team_id)
        )
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }

    return res.status(201).json({ invitation })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
