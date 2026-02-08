import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment' })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const bucketName = 'avatars'

  try {
    // Try to create the bucket; if it exists, Supabase returns an error which we'll tolerate
    const { data, error } = await supabase.storage.createBucket(bucketName, { public: true })

    if (error) {
      // If bucket already exists, treat as success
      const msg = String(error.message || '').toLowerCase()
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('exists')) {
        return res.status(200).json({ message: 'Bucket already exists', bucket: bucketName })
      }

      console.error('create bucket error', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ message: 'Bucket created', bucket: bucketName })
  } catch (err: any) {
    console.error('create bucket exception', err)
    return res.status(500).json({ error: err.message || 'Failed to create bucket' })
  }
}
