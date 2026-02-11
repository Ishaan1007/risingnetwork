import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabaseClient'
import { syncProfilePicture } from '../../lib/gravatar'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Sync profile picture
    const profilePicture = syncProfilePicture(session.user)
    
    if (profilePicture) {
      // Update user profile with synced picture
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: profilePicture,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ 
        message: 'Profile picture synced successfully',
        avatar_url: profilePicture,
        profile: data
      })
    } else {
      return res.status(404).json({ error: 'No profile picture available' })
    }

  } catch (error) {
    console.error('Error syncing avatar:', error)
    return res.status(500).json({ error: 'Failed to sync profile picture' })
  }
}
