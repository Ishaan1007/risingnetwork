import * as Ably from 'ably'
import { ChatClient } from '@ably/chat'
import type { ChatMessageEvent } from '@ably/chat'

export interface AblyConfig {
  apiKey: string
  clientId?: string
  autoConnect?: boolean
  disconnectedRetryTimeout?: number
  suspendedRetryTimeout?: number
  realtimeRequestTimeout?: number
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
    edited?: boolean
    deleted?: boolean
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

// Ably clients
let realtimeClient: Ably.Realtime | null = null
let chatClient: ChatClient | null = null
let chatRooms: Map<string, any> = new Map()

export function createAblyClient(config: AblyConfig): Ably.Realtime {
  const client = new Ably.Realtime({
    key: config.apiKey,
    clientId: config.clientId,
    autoConnect: config.autoConnect ?? true,
    disconnectedRetryTimeout: config.disconnectedRetryTimeout ?? 15000,
    suspendedRetryTimeout: config.suspendedRetryTimeout ?? 30000,
    realtimeRequestTimeout: config.realtimeRequestTimeout ?? 15000,
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
  return realtimeClient
}

export function getChatClient(): ChatClient | null {
  return chatClient
}

export async function initializeAbly(apiKey: string, clientId?: string): Promise<{ realtime: Ably.Realtime, chat: ChatClient }> {
  if (realtimeClient && chatClient) {
    return { realtime: realtimeClient, chat: chatClient }
  }

  realtimeClient = createAblyClient({
    apiKey,
    clientId,
  })

  chatClient = new ChatClient(realtimeClient)

  // Chat connection status
  chatClient.connection.onStatusChange((change) => {
    console.log(`Chat connection status is currently ${change.current}!`)
  })

  return { realtime: realtimeClient, chat: chatClient }
}

export async function getChatRoom(roomId: string) {
  if (!chatClient) {
    throw new Error('Chat client not initialized')
  }

  if (!chatRooms.has(roomId)) {
    const room = await chatClient.rooms.get(roomId)
    await room.attach()
    chatRooms.set(roomId, room)
  }

  return chatRooms.get(roomId)
}

export async function subscribeToMessages(
  roomId: string,
  callback: (message: ChatMessageEvent) => void
) {
  const room = await getChatRoom(roomId)
  
  const { historyBeforeSubscribe } = room.messages.subscribe(callback)
  
  // Return historical messages
  const historicalMessages = await historyBeforeSubscribe({ limit: 50 })
  return historicalMessages.items
}

export async function sendMessage(
  roomId: string,
  content: string,
  metadata?: any
) {
  const room = await getChatRoom(roomId)
  const message = await room.messages.send({ 
    text: content,
    metadata: metadata || {}
  })
  return message
}

export async function editMessage(
  roomId: string,
  messageSerial: number,
  newText: string
) {
  const room = await getChatRoom(roomId)
  const updatedMessage = await room.messages.update(messageSerial, { text: newText })
  return updatedMessage
}

export async function deleteMessage(roomId: string, messageSerial: number) {
  const room = await getChatRoom(roomId)
  await room.messages.delete(messageSerial)
}

export async function subscribeToTyping(
  roomId: string,
  callback: (typingEvent: any) => void
) {
  const room = await getChatRoom(roomId)
  room.typing.subscribe(callback)
}

export async function sendTyping(roomId: string) {
  const room = await getChatRoom(roomId)
  await room.typing.keystroke()
}

export async function stopTyping(roomId: string) {
  const room = await getChatRoom(roomId)
  await room.typing.stop()
}

export async function subscribeToPresence(
  roomId: string,
  callback: (presenceEvent: any) => void
) {
  const room = await getChatRoom(roomId)
  room.presence.subscribe(callback)
}

export async function enterPresence(roomId: string, data?: any) {
  const room = await getChatRoom(roomId)
  await room.presence.enter(data || "I'm here!")
}

export async function leavePresence(roomId: string, data?: any) {
  const room = await getChatRoom(roomId)
  await room.presence.leave(data || "I'm leaving!")
}

export async function updatePresence(roomId: string, data: any) {
  const room = await getChatRoom(roomId)
  await room.presence.update(data)
}

export async function subscribeToReactions(
  roomId: string,
  callback: (reactionEvent: any) => void
) {
  const room = await getChatRoom(roomId)
  room.reactions.subscribe(callback)
}

export async function addReaction(
  roomId: string,
  messageId: number,
  reaction: string
) {
  const room = await getChatRoom(roomId)
  await room.reactions.add(messageId, reaction)
}

export async function getRoomHistory(roomId: string, limit: number = 50) {
  const room = await getChatRoom(roomId)
  const history = await room.messages.history({ limit })
  return history.items
}

export async function getCurrentTyping(roomId: string) {
  const room = await getChatRoom(roomId)
  const typing = await room.typing.get()
  return typing.currentlyTyping
}

export async function getCurrentPresence(roomId: string) {
  const room = await getChatRoom(roomId)
  const presence = await room.presence.get()
  return presence.items
}

export async function disconnectAbly() {
  if (realtimeClient) {
    await realtimeClient.close()
    realtimeClient = null
  }
  if (chatClient) {
    chatClient = null
  }
  chatRooms.clear()
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

// Enhanced message creation helpers
export function createChatMessage(
  content: string,
  senderId: string,
  senderName: string,
  senderAvatar?: string,
  metadata?: any
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    type: 'text',
    senderId,
    senderName,
    senderAvatar,
    content,
    timestamp: Date.now(),
    channelId: '',
    metadata
  }
}

export function createSystemMessage(
  content: string,
  channelId: string
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    type: 'system',
    senderId: 'system',
    senderName: 'System',
    content,
    timestamp: Date.now(),
    channelId,
  }
}

// Typing management
export class TypingManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private typingUsers: Set<string> = new Set()

  constructor(
    private roomId: string,
    private currentUserId: string,
    private onTypingChange: (users: string[]) => void
  ) {}

  async startTyping() {
    if (!this.typingUsers.has(this.currentUserId)) {
      this.typingUsers.add(this.currentUserId)
      await sendTyping(this.roomId)
      this.onTypingChange(Array.from(this.typingUsers))
    }

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(this.currentUserId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      this.stopTyping()
    }, 1000)

    this.timeouts.set(this.currentUserId, timeout)
  }

  async stopTyping() {
    if (this.typingUsers.has(this.currentUserId)) {
      this.typingUsers.delete(this.currentUserId)
      await stopTyping(this.roomId)
      this.onTypingChange(Array.from(this.typingUsers))
    }

    const timeout = this.timeouts.get(this.currentUserId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(this.currentUserId)
    }
  }

  handleTypingEvent(typingEvent: any) {
    const currentlyTyping = typingEvent.currentlyTyping || new Set()
    this.typingUsers = new Set(currentlyTyping)
    this.onTypingChange(Array.from(this.typingUsers))
  }

  cleanup() {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
    this.typingUsers.clear()
  }
}
