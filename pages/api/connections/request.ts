import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendConnectionRequest } from '../../../lib/onesignalServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { requesterId, recipientId, message } = req.body
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!requesterId || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields: requesterId, recipientId' })
    }

    if (requesterId !== user.id) {
      return res.status(403).json({ error: 'Requester does not match authenticated user' })
    }
    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot connect with yourself' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const supabaseUser = getSupabaseUserClient(req.headers.authorization?.slice(7) || '')

    // Get both users' profiles
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, onesignal_player_id')
      .eq('id', requesterId)
      .single()
    const requesterProfile = requester as { first_name?: string | null; onesignal_player_id?: string | null } | null

    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, onesignal_player_id')
      .eq('id', recipientId)
      .single()
    const recipientProfile = recipient as { onesignal_player_id?: string | null; first_name?: string | null } | null

    if (requesterError || recipientError || !requesterProfile || !recipientProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!recipientProfile.onesignal_player_id) {
      return res.status(400).json({ error: 'Recipient has not enabled notifications' })
    }

    // Check if already connected
    const { data: existingConnection } = await supabaseUser
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`
      )
      .single()

    if (existingConnection) {
      return res.status(400).json({ error: 'Already connected or request pending' })
    }

    // Create connection request
    const { data: connection, error: connectionError } = await supabaseUser
      .from('connections')
      .insert({
        requester_id: requesterId,
        recipient_id: recipientId,
        status: 'pending',
        message: message || `${requesterProfile.first_name || 'Someone'} wants to connect with you`
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
