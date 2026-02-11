import OneSignal from 'react-onesignal'

export interface OneSignalInitOptions {
  appId: string
  notifyButton?: {
    enable: boolean
  }
  promptOptions?: {
    actionMessage: string
    acceptButtonText: string
    cancelButtonText: string
  }
}

export async function initializeOneSignal(appId: string, safariWebId?: string) {
  try {
    const initOptions: any = {
      appId,
      notifyButton: {
        enable: true,
      },
      promptOptions: {
        actionMessage: "RisingNetwork wants to show notifications for team invitations, meeting reminders, and connection requests.",
        acceptButtonText: "Allow",
        cancelButtonText: "Don't Allow"
      },
      allowLocalhostAsSecureOrigin: true, // For development
    }

    // Only add safari_web_id if provided
    if (safariWebId) {
      initOptions.safari_web_id = safariWebId
    }

    await OneSignal.init(initOptions)

    console.log('OneSignal initialized successfully')
    return true
  } catch (error) {
    console.error('Error initializing OneSignal:', error)
    return false
  }
}

export async function requestNotificationPermission() {
  try {
    const permission = await OneSignal.Notifications.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  try {
    const playerId = await OneSignal.User.pushSubscription.getIdAsync()
    return playerId
  } catch (error) {
    console.error('Error getting OneSignal player ID:', error)
    return null
  }
}

export async function subscribeToNotifications() {
  try {
    // Request permission first
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) {
      return false
    }

    // Get player ID
    const playerId = await getOneSignalPlayerId()
    if (!playerId) {
      return false
    }

    console.log('Successfully subscribed to notifications:', playerId)
    return playerId
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    return false
  }
}

export async function sendNotificationToUser(
  playerId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    await OneSignal.Notifications.postNotification({
      contents: { en: message },
      headings: { en: title },
      include_player_ids: [playerId],
      data: data || {},
      url: data?.url,
      buttons: data?.buttons || []
    })
    return true
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Notification types for RisingNetwork
export type NotificationType = 
  | 'team_invitation'
  | 'meeting_reminder'
  | 'connection_request'
  | 'team_update'
  | 'meeting_update'

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
  return sendNotificationToUser(
    playerId,
    'Team Invitation',
    `${inviterName} invited you to join ${teamName}`,
    {
      type: 'team_invitation',
      teamId,
      url: `/teams/${teamId}`,
      action: 'view_team'
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
  return sendNotificationToUser(
    playerId,
    'Meeting Reminder',
    `Your meeting "${meetingTitle}" starts at ${meetingTime}`,
    {
      type: 'meeting_reminder',
      meetingId,
      meetLink,
      url: `/meetings/${meetingId}`,
      action: 'join_meeting'
    }
  )
}

export async function sendConnectionRequest(
  playerId: string,
  requesterName: string,
  requesterId: string
) {
  return sendNotificationToUser(
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
          action: 'accept_connection'
        },
        {
          text: 'Decline',
          action: 'decline_connection'
        }
      ]
    }
  )
}

export async function sendFriendRequestAccepted(
  playerId: string,
  friendName: string,
  friendId: string
) {
  return sendNotificationToUser(
    playerId,
    'Connection Accepted!',
    `${friendName} accepted your connection request!`,
    {
      type: 'connection_accepted',
      userId: friendId,
      url: `/profile/${friendId}`,
      action: 'view_profile'
    }
  )
}

export async function sendFriendRequestDeclined(
  playerId: string,
  friendName: string,
  friendId: string
) {
  return sendNotificationToUser(
    playerId,
    'Connection Declined',
    `${friendName} declined your connection request`,
    {
      type: 'connection_declined',
      userId: friendId,
      url: '/connections',
      action: 'view_connections'
    }
  )
}
