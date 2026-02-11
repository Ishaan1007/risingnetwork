import { useEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { LoaderIcon } from './Icons'
import { 
  initializeAbly, 
  subscribeToChannel, 
  publishToChannel, 
  getChannelHistory,
  enterPresence,
  leavePresence,
  getPresence,
  CHANNELS,
  MESSAGE_TYPES,
  ChatMessage 
} from '../lib/ably'

interface ChatProps {
  channelId: string
  channelType: 'team' | 'meeting'
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
  placeholder?: string
  disabled?: boolean
}

export default function Chat({
  channelId,
  channelType,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  placeholder = "Type a message...",
  disabled = false
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const channelName = channelType === 'team' 
    ? CHANNELS.TEAM(channelId)
    : CHANNELS.MEETING(channelId)

  useEffect(() => {
    // Initialize Ably client
    const ablyClient = initializeAbly(
      process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY || '',
      currentUserId
    )

    // Setup connection handlers
    ablyClient.connection.on('connected', () => {
      setIsConnected(true)
      setIsLoading(false)
    })

    ablyClient.connection.on('disconnected', () => {
      setIsConnected(false)
    })

    // Enter presence
    enterPresence(channelName, {
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      status: 'online'
    })

    // Subscribe to messages
    const setupSubscriptions = async () => {
      try {
        // Subscribe to chat messages
        await subscribeToChannel(channelName, (message) => {
          switch (message.type) {
            case MESSAGE_TYPES.CHAT_MESSAGE:
              setMessages(prev => [...prev, message.data as ChatMessage])
              scrollToBottom()
              break

            case MESSAGE_TYPES.CHAT_TYPING:
              const typingUser = message.data.userName
              setTypingUsers(prev => {
                if (!prev.includes(typingUser)) {
                  return [...prev, typingUser]
                }
                return prev
              })
              break

            case MESSAGE_TYPES.CHAT_READ:
              // Handle read receipts
              break

            case MESSAGE_TYPES.PRESENCE_ENTER:
            case MESSAGE_TYPES.PRESENCE_LEAVE:
              // Update online users
              updateOnlineUsers()
              break
          }
        })

        // Load message history
        const history = await getChannelHistory(channelName, 50)
        const chatMessages = history
          .filter(msg => msg.name === MESSAGE_TYPES.CHAT_MESSAGE)
          .map(msg => msg.data as ChatMessage)
          .sort((a, b) => a.timestamp - b.timestamp)

        setMessages(chatMessages)
        scrollToBottom()

        // Get initial presence
        updateOnlineUsers()

      } catch (error) {
        console.error('Error setting up chat:', error)
        setIsLoading(false)
      }
    }

    setupSubscriptions()

    return () => {
      // Cleanup
      leavePresence(channelName)
    }
  }, [channelName, currentUserId, currentUserName, currentUserAvatar])

  const updateOnlineUsers = async () => {
    try {
      const presence = await getPresence(channelName)
      const users = presence
        .map(p => p.data?.userName)
        .filter(Boolean)
      setOnlineUsers(users)
    } catch (error) {
      console.error('Error getting presence:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true)
        publishToChannel(channelName, MESSAGE_TYPES.CHAT_TYPING, {
          userName: currentUserName,
          userId: currentUserId
        })
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)
    } else {
      setIsTyping(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !isConnected || disabled) {
      return
    }

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text',
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      content: newMessage.trim(),
      timestamp: Date.now(),
      channelId
    }

    try {
      await publishToChannel(channelName, MESSAGE_TYPES.CHAT_MESSAGE, message)
      setNewMessage('')
      setIsTyping(false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="rn-chat-container">
        <div className="rn-chat-loading">
          <LoaderIcon size={20} />
          <span>Connecting to chat...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rn-chat-container">
      {/* Chat Header */}
      <div className="rn-chat-header">
        <div className="rn-chat-info">
          <h3>{channelType === 'team' ? 'Team Chat' : 'Meeting Chat'}</h3>
          <div className="rn-chat-status">
            <span className={`rn-status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? `${onlineUsers.length} online` : 'Disconnected'}</span>
          </div>
        </div>
        <div className="rn-chat-users">
          {onlineUsers.slice(0, 3).map((user, index) => (
            <div key={index} className="rn-user-avatar" title={user}>
              <Avatar src={undefined} alt={user} size={24} />
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className="rn-more-users">
              +{onlineUsers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="rn-chat-messages">
        {messages.length === 0 ? (
          <div className="rn-chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rn-chat-message ${message.senderId === currentUserId ? 'own' : 'other'}`}
              >
                <div className="rn-message-avatar">
                  <Avatar src={message.senderAvatar} alt={message.senderName} size={32} />
                </div>
                <div className="rn-message-content">
                  <div className="rn-message-header">
                    <span className="rn-message-sender">{message.senderName}</span>
                    <span className="rn-message-time">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="rn-message-text">{message.content}</div>
                </div>
              </div>
            ))}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="rn-chat-typing">
                <div className="rn-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="rn-chat-input">
        <div className="rn-input-wrapper">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || !isConnected}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || disabled || !isConnected}
            className="rn-send-button"
          >
            Send
          </button>
        </div>
        <div className="rn-chat-footer">
          <span className="rn-chat-status-text">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </form>
    </div>
  )
}
