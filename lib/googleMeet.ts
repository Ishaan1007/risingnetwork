// Google Meet REST API integration
export interface GoogleMeetSpace {
  name: string
  accessLevel: string
  type: string
  configId: string
}

export interface CreateMeetingRequest {
  space: string
  title: string
  startTime: string
  endTime: string
  timeZone: string
  conferenceData: {
    createRequest: {
      name: string
      conferenceSolution: string
    }
  }
}

export interface MeetingResponse {
  name: string
  uri: string
  conferenceData: {
    conferenceId: string
    conferenceUri: string
    entryPoints: Array<{
      entryPointType: string
      uri: string
      accessCode: string
    }>
  }
}

// Create a Google Meet space
export async function createGoogleMeetSpace(
  accessToken: string,
  spaceName: string
): Promise<GoogleMeetSpace> {
  const response = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: spaceName,
      configId: 'meeting-space-config',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create Google Meet space')
  }

  return response.json()
}

// Create a meeting in a Google Meet space
export async function createGoogleMeeting(
  accessToken: string,
  spaceName: string,
  meetingData: CreateMeetingRequest
): Promise<MeetingResponse> {
  const response = await fetch(`https://meet.googleapis.com/v2/spaces/${spaceName}/conferences`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData),
  })

  if (!response.ok) {
    throw new Error('Failed to create Google Meet meeting')
  }

  return response.json()
}

// Get user's Google Meet spaces
export async function getGoogleMeetSpaces(
  accessToken: string
): Promise<GoogleMeetSpace[]> {
  const response = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google Meet spaces')
  }

  const data = await response.json()
  return data.spaces || []
}
