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
    if (typeof permission === 'boolean') return permission
    return Boolean(OneSignal.Notifications.permission)
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  try {
    const anySignal: any = OneSignal as any
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const subId = anySignal?.User?.PushSubscription?.id
      if (subId) return subId
      if (typeof anySignal.getUserId === 'function') {
        const legacyId = await anySignal.getUserId()
        if (legacyId) return legacyId
      }
      if (typeof anySignal?.User?.getId === 'function') {
        const userId = await anySignal.User.getId()
        if (userId) return userId
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
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
    if (!OneSignal.Notifications.permission) return false

    const playerId = await getOneSignalPlayerId()
    if (!playerId) return false

    return playerId
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    return false
  }
}
