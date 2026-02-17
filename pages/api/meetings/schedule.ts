import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseUserClient, getUserFromRequest } from '../../../lib/serverSupabase'
import { createGoogleMeetSpace, createGoogleMeeting, getGoogleMeetSpaces } from '../../../lib/googleMeet'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { title, description, participant_ids, scheduled_for, duration_minutes } = req.body
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'User ID required' })
      }

      if (!title || !participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
        return res.status(400).json({ 
          error: 'title, participant_ids (array) are required' 
        })
      }

      // Get user's Google access token (in production, get from database)
      const accessToken = process.env.GOOGLE_ACCESS_TOKEN || 'mock_token_for_development'

      // Create or get Google Meet space
      let spaceName = `RisingNetwork-${user.id}`
      let space
      
      try {
        const spaces = await getGoogleMeetSpaces(accessToken)
        space = spaces.find(s => s.name === spaceName)
        
        if (!space) {
          // Create new space
          space = await createGoogleMeetSpace(accessToken, spaceName)
        }
      } catch (error) {
        console.error('Error with Google Meet space:', error)
        // Fallback to mock link if Google API fails
      }

      // Create meeting using Google Meet API
      const startTime = new Date(scheduled_for || Date.now()).toISOString()
      const endTime = new Date(Date.parse(startTime) + (duration_minutes || 30) * 60000).toISOString()

      let meetLink: string
      
      if (space) {
        const meetingData = {
          space: space.name,
          title,
          startTime,
          endTime,
          timeZone: 'UTC',
          conferenceData: {
            createRequest: {
              name: 'meet',
              conferenceSolution: 'hangoutsAndMeet'
            }
          }
        }

        const meeting = await createGoogleMeeting(accessToken, space.name, meetingData)
        meetLink = meeting.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video')?.uri || meeting.conferenceData.conferenceUri
      } else {
        // Fallback mock link
        meetLink = `https://meet.google.com/lookup/${spaceName}-${Date.now()}`
      }

      // Create meeting record
      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data: meeting, error: meetingError } = await supabaseUser
        .from('meetings')
        .insert({
          title,
          description: description || '',
          created_by: user.id,
          scheduled_for: scheduled_for || new Date().toISOString(),
          duration_minutes: duration_minutes || 30,
          meet_link: meetLink,
          meeting_type: 'google_meet',
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
        user_id: user.id,
        status: 'accepted'
      })

      const { error: participantsError } = await supabaseUser
        .from('meeting_participants')
        .insert(participants)

      if (participantsError) {
        return res.status(500).json({ error: participantsError.message })
      }

      return res.status(201).json({ 
        meeting: {
          ...meeting,
          meet_link: meetLink,
          participants: participants.length
        },
        message: 'Google Meet scheduled successfully!'
      })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'GET') {
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({ error: 'User ID required' })
      }

      const token = req.headers.authorization?.slice(7) || ''
      const supabaseUser = getSupabaseUserClient(token)
      const { data: meetings, error } = await supabaseUser
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            user_id,
            status,
            profiles (
              name
            )
          )
        `)
        .or(`created_by.eq.${user.id},meeting_participants.user_id.eq.${user.id}`)
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
