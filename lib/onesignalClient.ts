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
        actionMessage:
          'RisingNetwork wants to show notifications for messages, team invitations, meeting reminders, and connection requests.',
        acceptButtonText: 'Allow',
        cancelButtonText: "Don't Allow",
      },
      allowLocalhostAsSecureOrigin: true,
    }

    if (safariWebId) {
      initOptions.safari_web_id = safariWebId
    }

    await OneSignal.init(initOptions)
    return true
  } catch (error) {
    console.error('Error initializing OneSignal:', error)
    return false
  }
}

export async function requestNotificationPermission() {
  try {
    const permission = await OneSignal.Notifications.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  try {
    const anySignal: any = OneSignal as any
    const subId = anySignal?.User?.PushSubscription?.id
    if (subId) return subId
    if (typeof anySignal.getUserId === 'function') {
      return await anySignal.getUserId()
    }
    if (typeof anySignal?.User?.getId === 'function') {
      return await anySignal.User.getId()
    }
    return null
  } catch (error) {
    console.error('Error getting OneSignal player ID:', error)
    return null
  }
}

export async function subscribeToNotifications() {
  try {
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) return false

    const playerId = await getOneSignalPlayerId()
    if (!playerId) return false

    return playerId
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    return false
  }
}
