import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../lib/serverSupabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { q = '', limit = '20', offset = '0' } = req.query
    const term = String(q).trim()
    const limitNum = Math.min(parseInt(String(limit)) || 20, 100)
    const offsetNum = parseInt(String(offset)) || 0

    if (!term) {
      return res.status(200).json({ data: [], total: 0 })
    }

    // Search profiles by name, city, or skill name
    // We'll query profiles and join user_skills -> skills to enable searching by skill
    const { data, error } = await supabaseServer
      .from('profiles')
      .select(
        `
        id,
        first_name,
        last_name,
        city,
        role,
        bio,
        linkedin_url,
        github_url,
        portfolio_url,
        avatar_url,
        user_skills ( skill_id, skills ( id, name ) )
      `,
        { count: 'exact' }
      )
      .or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,city.ilike.%${term}%`
      )

    if (error) {
      console.error('search profiles error', error)
      return res.status(500).json({ error: error.message })
    }

    // Filter additionally by skill match (since nested filtering is limited)
    const lowered = term.toLowerCase()
    const filtered = (data || []).filter((p: any) => {
      // if any skill matches term
      const skills = (p.user_skills || []).map((us: any) => us?.skills?.name?.toLowerCase()).filter(Boolean)
      if (skills.some((s: string) => s.includes(lowered))) return true
      // name or city already matched in or() but we'll ensure
      if (`${p.first_name} ${p.last_name}`.toLowerCase().includes(lowered)) return true
      if ((p.city || '').toLowerCase().includes(lowered)) return true
      return false
    })

    const paged = filtered.slice(offsetNum, offsetNum + limitNum)
    const transformed = paged.map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      city: p.city,
      role: p.role,
      bio: p.bio,
      linkedin_url: p.linkedin_url,
      github_url: p.github_url,
      portfolio_url: p.portfolio_url,
      avatar_url: p.avatar_url,
      skills: (p.user_skills || []).map((us: any) => us.skills).filter(Boolean),
    }))

    return res.status(200).json({ data: transformed, total: filtered.length, limit: limitNum, offset: offsetNum })
  } catch (err: any) {
    console.error('search handler error', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
