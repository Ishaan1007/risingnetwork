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
      .select('name, onesignal_player_id')
      .eq('id', requesterId)
      .single()
    const requesterProfile = requester as { name?: string | null; onesignal_player_id?: string | null } | null

    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('name, onesignal_player_id, notifications_enabled')
      .eq('id', recipientId)
      .single()
    const recipientProfile = recipient as {
      onesignal_player_id?: string | null
      name?: string | null
      notifications_enabled?: boolean | null
    } | null

    if (requesterError || recipientError || !requesterProfile || !recipientProfile) {
      return res.status(404).json({ error: 'User not found' })
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
        message: message || `${requesterProfile.name || 'Someone'} wants to connect with you`
      })
      .select()
      .single()

    if (connectionError) {
      return res.status(500).json({ error: 'Failed to send connection request' })
    }

    // Send notification to recipient (best effort)
    try {
      if (recipientProfile.notifications_enabled && recipientProfile.onesignal_player_id) {
        const sent = await sendConnectionRequest(
          recipientProfile.onesignal_player_id,
          requesterProfile.name || 'Someone',
          requesterId
        )
        if (sent) {
          console.log('Connection request notification sent successfully')
        } else {
          console.warn('Connection request notification was not delivered')
        }
      } else {
        console.log('Recipient notifications are disabled or player id is missing')
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
