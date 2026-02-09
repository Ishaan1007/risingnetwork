import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

type SignResponse = {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
}

export default function handler(req: NextApiRequest, res: NextApiResponse<SignResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary env vars are missing' })
  }

  const { public_id } = req.body as { public_id?: string }
  if (!public_id) {
    return res.status(400).json({ error: 'public_id required' })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'avatars'

  const toSign = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`
  const signature = crypto.createHash('sha1').update(toSign).digest('hex')

  return res.status(200).json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    publicId: public_id,
  })
}
