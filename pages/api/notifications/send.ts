import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendTeamInvitation, sendMeetingReminder, sendConnectionRequest, sendNotificationToPlayer } from '../../../lib/onesignalServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, recipientId, data } = req.body
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!type || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields: type, recipientId' })
    }

    // Get recipient's OneSignal player ID
    const supabaseAdmin = getSupabaseAdmin()
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('onesignal_player_id, first_name')
      .eq('id', recipientId)
      .single()
    const recipientProfile = recipient as { onesignal_player_id?: string | null; first_name?: string | null } | null

    if (recipientError || !recipientProfile) {
      return res.status(404).json({ error: 'Recipient not found' })
    }

    if (!recipientProfile.onesignal_player_id) {
      return res.status(400).json({ error: 'Recipient has not enabled notifications' })
    }

    let success = false
    let message = ''

    // Send notification based on type
    switch (type) {
      case 'team_invitation':
        success = await sendTeamInvitation(
          recipientProfile.onesignal_player_id,
          data.inviterName,
          data.teamName,
          data.teamId
        )
        message = 'Team invitation sent successfully'
        break

      case 'meeting_reminder':
        success = await sendMeetingReminder(
          recipientProfile.onesignal_player_id,
          data.meetingTitle,
          data.meetingTime,
          data.meetingId,
          data.meetLink
        )
        message = 'Meeting reminder sent successfully'
        break

      case 'connection_request':
        success = await sendConnectionRequest(
          recipientProfile.onesignal_player_id,
          data.requesterName,
          data.requesterId
        )
        message = 'Friend request sent successfully'
        break

      case 'connection_accepted':
        success = await sendNotificationToPlayer(
          recipientProfile.onesignal_player_id,
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
          recipientProfile.onesignal_player_id,
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
        recipient: recipientProfile.first_name 
      })
    } else {
      return res.status(500).json({ error: 'Failed to send notification' })
    }

  } catch (error) {
    console.error('Error sending notification:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
