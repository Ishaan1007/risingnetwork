import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import { LoaderIcon } from './Icons'
import { 
  initializeAbly, 
  subscribeToMessages,
  sendMessage as sendAblyMessage,
  editMessage,
  deleteMessage,
  subscribeToTyping,
  sendTyping,
  stopTyping,
  subscribeToPresence,
  enterPresence,
  leavePresence,
  subscribeToReactions,
  addReaction,
  TypingManager,
  createChatMessage,
  createSystemMessage
} from '../lib/ably'
import type { ChatMessageEvent } from '@ably/chat'

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
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [typingManager, setTypingManager] = useState<TypingManager | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const setupChat = async () => {
      try {
        setIsLoading(true)

        // Initialize Ably with Chat SDK
        const { realtime, chat } = await initializeAbly(
          process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY || '',
          currentUserId
        )

        // Connection handlers
        chat.connection.onStatusChange((change) => {
          console.log(`Chat connection status is currently ${change.current}!`)
          setIsConnected(change.current === 'connected')
          if (change.current === 'connected') {
            setIsLoading(false)
          }
        })

        // Get chat room
        const roomId = channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`
        
        // Enter presence
        await enterPresence(roomId, {
          userId: currentUserId,
          userName: currentUserName,
          userAvatar: currentUserAvatar,
          status: 'online'
        })

        // Subscribe to messages
        const historicalMessages = await subscribeToMessages(roomId, (messageEvent: ChatMessageEvent) => {
          const message = {
            id: messageEvent.message.serial.toString(),
            type: 'text',
            senderId: messageEvent.message.clientId,
            senderName: messageEvent.message.clientId === currentUserId ? currentUserName : messageEvent.message.clientId,
            senderAvatar: messageEvent.message.clientId === currentUserId ? currentUserAvatar : undefined,
            content: messageEvent.message.text,
            timestamp: messageEvent.message.timestamp,
            channelId,
            metadata: messageEvent.message.metadata || {}
          }
          
          setMessages(prev => {
            const filtered = prev.filter((m: any) => m.id !== message.id)
            return [...filtered, message].sort((a: any, b: any) => a.timestamp - b.timestamp)
          })
          scrollToBottom()
        })

        // Load historical messages
        const formattedHistory = historicalMessages.map((msg: any) => ({
          id: msg.serial.toString(),
          type: 'text',
          senderId: msg.clientId,
          senderName: msg.clientId === currentUserId ? currentUserName : msg.clientId,
          senderAvatar: msg.clientId === currentUserId ? currentUserAvatar : undefined,
          content: msg.text,
          timestamp: msg.timestamp,
          channelId,
          metadata: msg.metadata || {}
        })).sort((a: any, b: any) => a.timestamp - b.timestamp)

        setMessages(formattedHistory)
        scrollToBottom()

        // Subscribe to typing
        await subscribeToTyping(roomId, (typingEvent: any) => {
          if (typingEvent.currentlyTyping.size === 0) {
            setTypingUsers([])
          } else {
            setTypingUsers(Array.from(typingEvent.currentlyTyping))
          }
        })

        // Subscribe to presence
        await subscribeToPresence(roomId, (presenceEvent: any) => {
          const { clientId, data } = presenceEvent.member
          console.log(`Presence event: ${presenceEvent.type} from ${clientId} with data ${JSON.stringify(data)}`)
          
          // Update online users list
          if (presenceEvent.type === 'enter' || presenceEvent.type === 'leave') {
            // You might want to fetch updated presence here
          }
        })

        // Subscribe to reactions
        await subscribeToReactions(roomId, (reactionEvent: any) => {
          console.log(`${reactionEvent.reaction.clientId}: ${reactionEvent.reaction.name} to that!`)
        })

        // Setup typing manager
        const manager = new TypingManager(
          roomId,
          currentUserId,
          (users) => setTypingUsers(users.filter((u: string) => u !== currentUserName))
        )
        setTypingManager(manager)

      } catch (error) {
        console.error('Error setting up chat:', error)
        setIsLoading(false)
      }
    }

    setupChat()

    return () => {
      // Cleanup
      if (typingManager) {
        typingManager.cleanup()
      }
      leavePresence(channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`)
    }
  }, [channelId, channelType, currentUserId, currentUserName, currentUserAvatar])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (typingManager) {
      if (value.trim()) {
        typingManager.startTyping()
      } else {
        typingManager.stopTyping()
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !isConnected || disabled) {
      return
    }

    try {
      const roomId = channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`
      await sendAblyMessage(roomId, newMessage.trim())
      
      setNewMessage('')
      
      if (typingManager) {
        typingManager.stopTyping()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      const roomId = channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`
      await editMessage(roomId, parseInt(messageId), newText)
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const roomId = channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`
      await deleteMessage(roomId, parseInt(messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleAddReaction = async (messageId: string, reaction: string) => {
    try {
      const roomId = channelType === 'team' ? `team:${channelId}` : `meeting:${channelId}`
      await addReaction(roomId, parseInt(messageId), reaction)
    } catch (error) {
      console.error('Error adding reaction:', error)
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
                  {message.senderId === currentUserId && (
                    <div className="rn-message-actions">
                      <button
                        onClick={() => handleEditMessage(message.id, message.content)}
                        className="rn-message-action-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="rn-message-action-btn"
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
      <form onSubmit={handleSendMessage} className="rn-chat-input">
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
