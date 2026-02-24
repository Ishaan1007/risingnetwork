import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { getUserFromRequest } from '../../../lib/serverSupabase'

type SignResponse = {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  uploadPreset?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SignResponse | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary env vars are missing' })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { public_id } = req.body as { public_id?: string }

  const safePublicId =
    public_id && public_id.startsWith(`${user.id}-`)
      ? public_id
      : `${user.id}-${Date.now()}`

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'avatars'

  const paramsToSign = [
    `folder=${folder}`,
    `public_id=${safePublicId}`,
    `timestamp=${timestamp}`,
  ]
  if (uploadPreset) {
    paramsToSign.push(`upload_preset=${uploadPreset}`)
  }
  const toSign = `${paramsToSign.join('&')}${apiSecret}`
  const signature = crypto.createHash('sha1').update(toSign).digest('hex')

  return res.status(200).json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    publicId: safePublicId,
    uploadPreset: uploadPreset || undefined,
  })
}
