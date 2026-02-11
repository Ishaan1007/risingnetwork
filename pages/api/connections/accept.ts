import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'
import { sendFriendRequestAccepted } from '../../../lib/onesignal'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { requesterId, recipientId } = req.body

    if (!requesterId || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields: requesterId, recipientId' })
    }

    // Get both users' profiles
    const { data: requester, error: requesterError } = await supabase
      .from('profiles')
      .select('first_name, onesignal_player_id')
      .eq('id', requesterId)
      .single()

    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('first_name, onesignal_player_id')
      .eq('id', recipientId)
      .single()

    if (requesterError || recipientError || !requester || !recipient) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!recipient.onesignal_player_id) {
      return res.status(400).json({ error: 'Recipient has not enabled notifications' })
    }

    // Update connection request to accepted
    const { data: connection, error: updateError } = await supabase
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

    // Send notification to requester
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'connection_accepted',
          recipientId: requesterId,
          data: {
            friendName: recipient.first_name,
            friendId: recipientId
          }
        })
      })

      if (notificationResponse.ok) {
        console.log('Connection accepted notification sent to requester')
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
