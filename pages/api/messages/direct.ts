import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getUserFromRequest } from '../../../lib/serverSupabase'
import { sendDirectMessageNotification } from '../../../lib/onesignalServer'

function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

async function getOrCreateDirectConversation(
  supabaseAdmin: any,
  currentUserId: string,
  otherUserId: string
) {
  const [directUserA, directUserB] = normalizePair(currentUserId, otherUserId)

  const { data: existingConversation } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('type', 'direct')
    .eq('direct_user_a', directUserA)
    .eq('direct_user_b', directUserB)
    .maybeSingle()

  if (existingConversation?.id) {
    return existingConversation.id as string
  }

  const { data: createdConversation, error: createError } = await supabaseAdmin
    .from('conversations')
    .insert({
      type: 'direct',
      direct_user_a: directUserA,
      direct_user_b: directUserB,
      created_by: currentUserId,
    })
    .select('id')
    .single()

  if (!createError && createdConversation?.id) {
    return createdConversation.id as string
  }

  // Handle race on unique index: fetch again.
  const { data: racedConversation, error: raceReadError } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('type', 'direct')
    .eq('direct_user_a', directUserA)
    .eq('direct_user_b', directUserB)
    .single()

  if (raceReadError || !racedConversation?.id) {
    throw new Error(createError?.message || raceReadError?.message || 'Failed to create conversation')
  }

  return racedConversation.id as string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (req.method === 'GET') {
      const otherUserId = String(req.query.user_id || '')
      if (!otherUserId) {
        return res.status(400).json({ error: 'user_id is required' })
      }
      if (otherUserId === user.id) {
        return res.status(400).json({ error: 'Cannot message yourself' })
      }

      const { data: otherUser, error: otherUserError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, avatar_url, city')
        .eq('id', otherUserId)
        .single()

      if (otherUserError || !otherUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      const conversationId = await getOrCreateDirectConversation(supabaseAdmin, user.id, otherUserId)

      const { data: rows, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          profiles!messages_sender_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (messagesError) {
        return res.status(500).json({ error: messagesError.message })
      }

      const messages = (rows || []).map((row: any) => ({
        id: row.id,
        content: row.content || '',
        created_at: row.created_at,
        sender_id: row.sender_id,
        sender_name: row.profiles?.name || 'User',
        sender_avatar: row.profiles?.avatar_url || null,
      }))

      return res.status(200).json({
        conversation_id: conversationId,
        other_user: otherUser,
        messages,
      })
    }

    if (req.method === 'POST') {
      const { user_id: otherUserId, content } = req.body || {}
      const cleanOtherUserId = String(otherUserId || '')
      const cleanContent = String(content || '').trim()

      if (!cleanOtherUserId || !cleanContent) {
        return res.status(400).json({ error: 'user_id and content are required' })
      }
      if (cleanOtherUserId === user.id) {
        return res.status(400).json({ error: 'Cannot message yourself' })
      }
      if (cleanContent.length > 2000) {
        return res.status(400).json({ error: 'Message is too long' })
      }

      const { data: otherUser, error: otherUserError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, onesignal_player_id, notifications_enabled')
        .eq('id', cleanOtherUserId)
        .single()

      if (otherUserError || !otherUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      const conversationId = await getOrCreateDirectConversation(supabaseAdmin, user.id, cleanOtherUserId)

      const { data: inserted, error: insertError } = await (supabaseAdmin as any)
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: cleanContent,
          type: 'text',
        })
        .select('id, content, created_at, sender_id')
        .single()

      if (insertError) {
        return res.status(500).json({ error: insertError.message })
      }

      try {
        const senderName =
          user.user_metadata?.name ||
          [user.user_metadata?.given_name, user.user_metadata?.family_name].filter(Boolean).join(' ') ||
          'Someone'

        const recipient = otherUser as {
          onesignal_player_id?: string | null
          notifications_enabled?: boolean | null
        } | null

        if (recipient?.notifications_enabled && recipient.onesignal_player_id) {
          await sendDirectMessageNotification(
            recipient.onesignal_player_id,
            senderName,
            user.id,
            cleanContent
          )
        }
      } catch (notifyError) {
        // Notification failure should not block message delivery.
        console.error('direct message notification failed:', notifyError)
      }

      return res.status(201).json({
        message: inserted,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
