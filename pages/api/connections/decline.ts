import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendFriendRequestDeclined } from '../../../lib/onesignalServer'

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
      .select('first_name, onesignal_player_id')
      .eq('id', requesterId)
      .single()

    const { data: recipient, error: recipientError }: {
      data: { onesignal_player_id?: string | null; first_name?: string | null } | null
      error: any
    } = await supabaseAdmin
      .from('profiles')
      .select('first_name, onesignal_player_id')
      .eq('id', recipientId)
      .single()

    if (requesterError || recipientError || !requester || !recipient) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update connection request to declined
    const { data: connection, error: updateError } = await supabaseUser
      .from('connections')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString()
      })
      .eq('requester_id', requesterId)
      .eq('recipient_id', recipientId)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: 'Failed to decline connection request' })
    }

    // Send notification to requester
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'connection_declined',
          recipientId: requesterId,
          data: {
            friendName: recipient.first_name,
            friendId: recipientId
          }
        })
      })

      if (notificationResponse.ok) {
        console.log('Connection declined notification sent to requester')
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }

    return res.status(200).json({
      success: true,
      message: 'Connection declined successfully',
      connection
    })

  } catch (error) {
    console.error('Error declining connection request:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
