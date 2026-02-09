import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { title, description, participant_ids, scheduled_for, duration_minutes, meeting_type } = req.body
      const userId = req.headers['x-user-id'] as string

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' })
      }

      if (!title || !participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
        return res.status(400).json({ 
          error: 'title, participant_ids (array) are required' 
        })
      }

      // Create meeting record
      const { data: meeting, error: meetingError } = await supabaseServer
        .from('meetings')
        .insert({
          title,
          description: description || '',
          created_by: userId,
          scheduled_for: scheduled_for || new Date().toISOString(),
          duration_minutes: duration_minutes || 30,
          meeting_type: meeting_type || 'google_meet',
          status: 'scheduled'
        })
        .select()
        .single()

      if (meetingError) {
        return res.status(500).json({ error: meetingError.message })
      }

      // Add participants
      const participants = participant_ids.map((participantId: string) => ({
        meeting_id: meeting.id,
        user_id: participantId,
        status: 'invited'
      }))

      // Include creator as participant
      participants.push({
        meeting_id: meeting.id,
        user_id: userId,
        status: 'accepted'
      })

      const { error: participantsError } = await supabaseServer
        .from('meeting_participants')
        .insert(participants)

      if (participantsError) {
        return res.status(500).json({ error: participantsError.message })
      }

      // Generate Google Meet link (in production, integrate with Google Calendar API)
      const meetLink = `https://meet.google.com/${meeting.id}-${Date.now()}`

      // Update meeting with meet link
      const { data: updatedMeeting, error: updateError } = await supabaseServer
        .from('meetings')
        .update({ meet_link: meetLink })
        .eq('id', meeting.id)
        .select()
        .single()

      if (updateError) {
        return res.status(500).json({ error: updateError.message })
      }

      return res.status(201).json({ 
        meeting: updatedMeeting,
        meet_link: meetLink
      })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'GET') {
    try {
      const userId = req.headers['x-user-id'] as string

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' })
      }

      const { data: meetings, error } = await supabaseServer
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            user_id,
            status,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .or(`created_by.eq.${userId},meeting_participants.user_id.eq.${userId}`)
        .eq('meeting_participants.status', 'accepted')
        .order('scheduled_for', { ascending: true })

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ meetings: meetings || [] })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
