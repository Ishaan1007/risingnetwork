import * as Ably from 'ably'

export interface AblyConfig {
  apiKey: string
  clientId?: string
  autoConnect?: boolean
  disconnectedRetryTimeout?: number
  suspendedRetryTimeout?: number
  realtimeRequestTimeout?: number
}

export interface AblyMessage {
  type: string
  data: any
  id?: string
  timestamp?: number
  clientId?: string
  connectionId?: string
}

export interface ChatMessage {
  id: string
  type: 'text' | 'image' | 'file' | 'system'
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: number
  channelId: string
  metadata?: {
    fileName?: string
    fileSize?: number
    fileType?: string
    imageUrl?: string
  }
}

export interface TeamUpdate {
  type: 'member_joined' | 'member_left' | 'team_updated' | 'meeting_created'
  teamId: string
  teamName: string
  userId: string
  userName: string
  data?: any
  timestamp: number
}

export interface MeetingUpdate {
  type: 'meeting_created' | 'meeting_updated' | 'meeting_started' | 'meeting_ended'
  meetingId: string
  meetingTitle: string
  teamId: string
  userId: string
  userName: string
  data?: {
    meetLink?: string
    startTime?: string
    endTime?: string
  }
  timestamp: number
}

export interface ConnectionRequest {
  type: 'connection_request' | 'connection_accepted' | 'connection_declined'
  requesterId: string
  requesterName: string
  recipientId: string
  recipientName: string
  timestamp: number
}

// Ably client instance
let ablyClient: Ably.Realtime | null = null
let ablyChannels: Map<string, Ably.Channels> = new Map()

export function createAblyClient(config: AblyConfig): Ably.Realtime {
  const client = new Ably.Realtime({
    key: config.apiKey,
    clientId: config.clientId,
    autoConnect: config.autoConnect ?? true,
    disconnectedRetryTimeout: config.disconnectedRetryTimeout ?? 15000,
    suspendedRetryTimeout: config.suspendedRetryTimeout ?? 30000,
    realtimeRequestTimeout: config.realtimeRequestTimeout ?? 15000,
    rest: {
      restRequestTimeout: 15000,
    },
  })

  // Connection state handlers
  client.connection.on('connected', () => {
    console.log('Ably connected successfully')
  })

  client.connection.on('disconnected', () => {
    console.log('Ably disconnected')
  })

  client.connection.on('failed', (error) => {
    console.error('Ably connection failed:', error)
  })

  client.connection.on('suspended', () => {
    console.log('Ably connection suspended')
  })

  return client
}

export function getAblyClient(): Ably.Realtime | null {
  return ablyClient
}

export function initializeAbly(apiKey: string, clientId?: string): Ably.Realtime {
  if (ablyClient) {
    return ablyClient
  }

  ablyClient = createAblyClient({
    apiKey,
    clientId,
  })

  return ablyClient
}

export function getChannel(channelName: string): Ably.Channels | null {
  if (!ablyClient) {
    console.error('Ably client not initialized')
    return null
  }

  if (!ablyChannels.has(channelName)) {
    const channel = ablyClient.channels.get(channelName)
    ablyChannels.set(channelName, channel)
  }

  return ablyChannels.get(channelName) || null
}

export async function subscribeToChannel(
  channelName: string,
  callback: (message: AblyMessage) => void
): Promise<void> {
  const channel = getChannel(channelName)
  if (!channel) {
    throw new Error(`Failed to get channel: ${channelName}`)
  }

  channel.subscribe((message) => {
    callback({
      type: message.name,
      data: message.data,
      id: message.id,
      timestamp: message.timestamp,
      clientId: message.clientId,
      connectionId: message.connectionId,
    })
  })
}

export async function publishToChannel(
  channelName: string,
  messageType: string,
  data: any
): Promise<void> {
  const channel = getChannel(channelName)
  if (!channel) {
    throw new Error(`Failed to get channel: ${channelName}`)
  }

  await channel.publish(messageType, data)
}

export async function unsubscribeFromChannel(channelName: string): Promise<void> {
  const channel = getChannel(channelName)
  if (channel) {
    channel.detach()
    ablyChannels.delete(channelName)
  }
}

export async function disconnectAbly(): Promise<void> {
  if (ablyClient) {
    await ablyClient.close()
    ablyClient = null
    ablyChannels.clear()
  }
}

// Channel naming conventions
export const CHANNELS = {
  // Team channels: team:{teamId}
  TEAM: (teamId: string) => `team:${teamId}`,
  
  // Meeting channels: meeting:{meetingId}
  MEETING: (meetingId: string) => `meeting:${meetingId}`,
  
  // User channels: user:{userId}
  USER: (userId: string) => `user:${userId}`,
  
  // Connection channels: connection:{userId}
  CONNECTION: (userId: string) => `connection:${userId}`,
  
  // Global channels: global:{type}
  GLOBAL: (type: string) => `global:${type}`,
  
  // Chat channels: chat:{teamId} or chat:{meetingId}
  CHAT: (id: string) => `chat:${id}`,
} as const

// Message types
export const MESSAGE_TYPES = {
  // Chat messages
  CHAT_MESSAGE: 'chat_message',
  CHAT_TYPING: 'chat_typing',
  CHAT_READ: 'chat_read',
  
  // Team updates
  TEAM_MEMBER_JOINED: 'team_member_joined',
  TEAM_MEMBER_LEFT: 'team_member_left',
  TEAM_UPDATED: 'team_updated',
  
  // Meeting updates
  MEETING_CREATED: 'meeting_created',
  MEETING_UPDATED: 'meeting_updated',
  MEETING_STARTED: 'meeting_started',
  MEETING_ENDED: 'meeting_ended',
  
  // Connection requests
  CONNECTION_REQUEST: 'connection_request',
  CONNECTION_ACCEPTED: 'connection_accepted',
  CONNECTION_DECLINED: 'connection_declined',
  
  // Presence
  PRESENCE_ENTER: 'presence_enter',
  PRESENCE_LEAVE: 'presence_leave',
  PRESENCE_UPDATE: 'presence_update',
} as const

// Presence management
export async function enterPresence(channelName: string, data?: any): Promise<void> {
  const channel = getChannel(channelName)
  if (channel) {
    await channel.presence.enter(data)
  }
}

export async function leavePresence(channelName: string): Promise<void> {
  const channel = getChannel(channelName)
  if (channel) {
    await channel.presence.leave()
  }
}

export async function updatePresence(channelName: string, data: any): Promise<void> {
  const channel = getChannel(channelName)
  if (channel) {
    await channel.presence.update(data)
  }
}

export async function getPresence(channelName: string): Promise<Ably.PresenceMessage[]> {
  const channel = getChannel(channelName)
  if (!channel) {
    return []
  }

  return new Promise((resolve, reject) => {
    channel.presence.get((err, messages) => {
      if (err) {
        reject(err)
      } else {
        resolve(messages || [])
      }
    })
  })
}

// History management
export async function getChannelHistory(
  channelName: string,
  limit: number = 50
): Promise<Ably.Message[]> {
  const channel = getChannel(channelName)
  if (!channel) {
    return []
  }

  return new Promise((resolve, reject) => {
    channel.history({ limit }, (err, page) {
      if (err) {
        reject(err)
      } else {
        resolve(page?.items || [])
      }
    })
  })
}
