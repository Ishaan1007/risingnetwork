import { useState } from 'react'
import { GoogleMeetIcon } from './Icons'
import Avatar from './Avatar'

type Participant = {
  id: string
  name: string
  full_name: string
}

type ScheduleMeetModalProps = {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  onSchedule: (meetingData: any) => void
}

export default function ScheduleMeetModal({ isOpen, onClose, participants, onSchedule }: ScheduleMeetModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [scheduledFor, setScheduledFor] = useState('')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || selectedParticipants.length === 0) {
      return
    }

    setLoading(true)
    
    try {
      const meetingData = {
        title: title.trim(),
        description: description.trim(),
        participant_ids: selectedParticipants,
        scheduled_for: scheduledFor || new Date().toISOString(),
        duration_minutes: duration,
        meeting_type: 'google_meet'
      }

      await onSchedule(meetingData)
      
      // Reset form
      setTitle('')
      setDescription('')
      setSelectedParticipants([])
      setScheduledFor('')
      setDuration(30)
      onClose()
    } catch (error) {
      console.error('Error scheduling meeting:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    )
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleMeetIcon size={24} />
            Schedule Google Meet
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Meeting Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Standup"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 16
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              rows={3}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Participants * ({selectedParticipants.length} selected)
            </label>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8,
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: 12
            }}>
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 8,
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: selectedParticipants.includes(participant.id) ? '#eff6ff' : '#f9fafb',
                    border: selectedParticipants.includes(participant.id) ? '1px solid #3b82f6' : '1px solid transparent'
                  }}
                  onClick={() => toggleParticipant(participant.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(participant.id)}
                    onChange={() => {}}
                    style={{ marginRight: 12 }}
                  />
                  <Avatar size={32} />
                  <div style={{ marginLeft: 8, flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{participant.full_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Schedule For
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || selectedParticipants.length === 0}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: loading || !title.trim() || selectedParticipants.length === 0 ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: loading || !title.trim() || selectedParticipants.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {loading ? 'Scheduling...' : (
                <>
                  <GoogleMeetIcon size={16} />
                  Schedule Meet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
