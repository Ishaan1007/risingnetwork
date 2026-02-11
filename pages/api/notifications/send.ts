import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'
import { sendTeamInvitation, sendMeetingReminder, sendConnectionRequest, sendNotificationToPlayer } from '../../../lib/onesignal'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, recipientId, data } = req.body

    if (!type || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields: type, recipientId' })
    }

    // Get recipient's OneSignal player ID
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('onesignal_player_id, first_name')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return res.status(404).json({ error: 'Recipient not found' })
    }

    if (!recipient.onesignal_player_id) {
      return res.status(400).json({ error: 'Recipient has not enabled notifications' })
    }

    let success = false
    let message = ''

    // Send notification based on type
    switch (type) {
      case 'team_invitation':
        success = await sendTeamInvitation(
          recipient.onesignal_player_id,
          data.inviterName,
          data.teamName,
          data.teamId
        )
        message = 'Team invitation sent successfully'
        break

      case 'meeting_reminder':
        success = await sendMeetingReminder(
          recipient.onesignal_player_id,
          data.meetingTitle,
          data.meetingTime,
          data.meetingId,
          data.meetLink
        )
        message = 'Meeting reminder sent successfully'
        break

      case 'connection_request':
        success = await sendConnectionRequest(
          recipient.onesignal_player_id,
          data.requesterName,
          data.requesterId
        )
        message = 'Friend request sent successfully'
        break

      case 'connection_accepted':
        success = await sendNotificationToPlayer(
          recipient.onesignal_player_id,
          'Connection Accepted!',
          `${data.friendName} accepted your connection request!`,
          {
            type: 'connection_accepted',
            userId: data.friendId,
            url: `/profile/${data.friendId}`,
            action: 'view_profile'
          }
        )
        message = 'Connection accepted notification sent'
        break

      case 'connection_declined':
        success = await sendNotificationToPlayer(
          recipient.onesignal_player_id,
          'Connection Declined',
          `${data.friendName} declined your connection request`,
          {
            type: 'connection_declined',
            userId: data.friendId,
            url: '/connections',
            action: 'view_connections'
          }
        )
        message = 'Connection declined notification sent'
        break

      default:
        return res.status(400).json({ error: 'Invalid notification type' })
    }

    if (success) {
      return res.status(200).json({ 
        success: true, 
        message,
        recipient: recipient.first_name 
      })
    } else {
      return res.status(500).json({ error: 'Failed to send notification' })
    }

  } catch (error) {
    console.error('Error sending notification:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
