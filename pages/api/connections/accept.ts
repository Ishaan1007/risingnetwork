import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendFriendRequestAccepted } from '../../../lib/onesignalServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { requesterId, recipientId } = req.body
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!requesterId || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields: requesterId, recipientId' })
    }

    if (recipientId !== user.id) {
      return res.status(403).json({ error: 'Recipient does not match authenticated user' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const supabaseUser = getSupabaseUserClient(req.headers.authorization?.slice(7) || '')

    // Get both users' profiles
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('profiles')
      .select('name, onesignal_player_id, notifications_enabled')
      .eq('id', requesterId)
      .single()
    const requesterProfile = requester as {
      onesignal_player_id?: string | null
      name?: string | null
      notifications_enabled?: boolean | null
    } | null

    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('name, onesignal_player_id')
      .eq('id', recipientId)
      .single()
    const recipientProfile = recipient as { onesignal_player_id?: string | null; name?: string | null } | null

    if (requesterError || recipientError || !requesterProfile || !recipientProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update connection request to accepted
    const { data: connection, error: updateError } = await supabaseUser
      .from('connections')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('requester_id', requesterId)
      .eq('recipient_id', recipientId)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: 'Failed to accept connection request' })
    }

    // Send notification to requester (best effort)
    try {
      if (requesterProfile.notifications_enabled && requesterProfile.onesignal_player_id) {
        const sent = await sendFriendRequestAccepted(
          requesterProfile.onesignal_player_id,
          recipientProfile.name || 'Someone',
          recipientId
        )
        if (sent) {
          console.log('Connection accepted notification sent to requester')
        } else {
          console.warn('Connection accepted notification was not delivered')
        }
      } else {
        console.log('Requester notifications are disabled or player id is missing')
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }

    return res.status(200).json({
      success: true,
      message: 'Connection accepted successfully',
      connection
    })

  } catch (error) {
    console.error('Error accepting connection request:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
