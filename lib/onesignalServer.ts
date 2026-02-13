function getOneSignalConfig() {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    throw new Error('Missing OneSignal app id or REST API key')
  }
  return { appId, apiKey }
}

export async function sendNotificationToPlayer(
  playerId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const { appId, apiKey } = getOneSignalConfig()
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        contents: { en: message },
        headings: { en: title },
        include_player_ids: [playerId],
        data: data || {},
        url: data?.url,
        buttons: data?.buttons || [],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

export type NotificationType =
  | 'team_invitation'
  | 'meeting_reminder'
  | 'connection_request'
  | 'team_update'
  | 'meeting_update'
  | 'connection_accepted'
  | 'connection_declined'

export interface NotificationData {
  type: NotificationType
  teamId?: string
  meetingId?: string
  userId?: string
  url?: string
  action?: string
}

export async function sendTeamInvitation(
  playerId: string,
  inviterName: string,
  teamName: string,
  teamId: string
) {
  return sendNotificationToPlayer(
    playerId,
    'Team Invitation',
    `${inviterName} invited you to join ${teamName}`,
    {
      type: 'team_invitation',
      teamId,
      url: `/teams/${teamId}`,
      action: 'view_team',
    }
  )
}

export async function sendMeetingReminder(
  playerId: string,
  meetingTitle: string,
  meetingTime: string,
  meetingId: string,
  meetLink?: string
) {
  return sendNotificationToPlayer(
    playerId,
    'Meeting Reminder',
    `Your meeting "${meetingTitle}" starts at ${meetingTime}`,
    {
      type: 'meeting_reminder',
      meetingId,
      meetLink,
      url: `/meetings/${meetingId}`,
      action: 'join_meeting',
    }
  )
}

export async function sendConnectionRequest(
  playerId: string,
  requesterName: string,
  requesterId: string
) {
  return sendNotificationToPlayer(
    playerId,
    'Connection Request',
    `${requesterName} wants to connect with you`,
    {
      type: 'connection_request',
      userId: requesterId,
      url: '/connections',
      action: 'view_connections',
      buttons: [
        {
          text: 'Accept',
          action: 'accept_connection',
        },
        {
          text: 'Decline',
          action: 'decline_connection',
        },
      ],
    }
  )
}

export async function sendFriendRequestAccepted(
  playerId: string,
  friendName: string,
  friendId: string
) {
  return sendNotificationToPlayer(
    playerId,
    'Connection Accepted!',
    `${friendName} accepted your connection request!`,
    {
      type: 'connection_accepted',
      userId: friendId,
      url: `/profile/${friendId}`,
      action: 'view_profile',
    }
  )
}

export async function sendFriendRequestDeclined(
  playerId: string,
  friendName: string,
  friendId: string
) {
  return sendNotificationToPlayer(
    playerId,
    'Connection Declined',
    `${friendName} declined your connection request`,
    {
      type: 'connection_declined',
      userId: friendId,
      url: '/connections',
      action: 'view_connections',
    }
  )
}
