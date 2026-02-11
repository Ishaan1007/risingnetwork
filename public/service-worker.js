// OneSignal Service Worker
import 'https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js'

// Custom notification handling
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const data = notification.data

  // Handle notification clicks based on type
  if (data.type === 'team_invitation') {
    event.waitUntil(
      clients.openWindow(data.url || '/teams')
    )
  } else if (data.type === 'meeting_reminder') {
    event.waitUntil(
      clients.openWindow(data.url || '/meetings')
    )
  } else if (data.type === 'connection_request') {
    event.waitUntil(
      clients.openWindow(data.url || '/connections')
    )
  } else {
    // Default to home page
    event.waitUntil(
      clients.openWindow('/')
    )
  }

  // Close the notification
  notification.close()
})

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  const options = {
    body: data.contents?.en || data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.buttons || []
  }

  event.waitUntil(
    self.registration.showNotification(data.headings?.en || data.title, options)
  )
})
