import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'
import { sendConnectionRequest } from '../../../lib/onesignal'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { requesterId, recipientId, message } = req.body

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

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('*')
      .or(
        (requester_id.eq(requesterId) && recipient_id.eq(recipientId)),
        (requester_id.eq(recipientId) && recipient_id.eq(requesterId))
      )
      .single()

    if (existingConnection) {
      return res.status(400).json({ error: 'Already connected or request pending' })
    }

    // Create connection request
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        requester_id: requesterId,
        recipient_id: recipientId,
        status: 'pending',
        message: message || `${requester.first_name} wants to connect with you`
      })
      .select()
      .single()

    if (connectionError) {
      return res.status(500).json({ error: 'Failed to send connection request' })
    }

    // Send notification to recipient
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'connection_request',
          recipientId,
          data: {
            requesterName: requester.first_name,
            requesterId: requesterId
          }
        })
      })

      if (notificationResponse.ok) {
        console.log('Connection request notification sent successfully')
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      connection
    })

  } catch (error) {
    console.error('Error sending connection request:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
