import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '../../lib/serverSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { city, skills, role, university_id, limit = '10', offset = '0' } = req.query

    const limitNum = Math.min(parseInt(limit as string) || 10, 100)
    const offsetNum = parseInt(offset as string) || 0
    const skillIds = skills
      ? (skills as string).split(',').map(Number).filter(Boolean)
      : []
    const universityIdNum = university_id ? parseInt(String(university_id)) : null

    // Base query: get freelancers with their skills
    let query = supabaseServer
      .from('profiles')
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        city,
        role,
        bio,
        linkedin_url,
        github_url,
        portfolio_url,
        avatar_url,
        user_skills (
          skill_id,
          skills (
            id,
            name,
            category
          )
        ),
        college_info (
          college_id,
          major,
          semester,
          colleges (
            id,
            name,
            city
          )
        )
      `,
        { count: 'exact' }
      )

    // Filter by city if provided (post-filter for flexibility across profile city and college city)

    if (role) {
      query = query.eq('role', role)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Freelancer fetch error:', error)
      return res.status(500).json({
        error: `Failed to fetch freelancers: ${error.message}`,
      })
    }

    // Filter by skills on the result (since Supabase nested filtering is limited)
    let filtered = data || []
    if (skillIds.length > 0) {
      filtered = filtered.filter((profile: any) => {
        const profileSkillIds = profile.user_skills.map(
          (us: any) => us.skill_id
        )
        return skillIds.some((id) => profileSkillIds.includes(id))
      })
    }

    if (city) {
      const cityLower = String(city).toLowerCase()
      filtered = filtered.filter((profile: any) => {
        const profileCity = String(profile.city || '').toLowerCase()
        const collegeCity = String(profile.college_info?.[0]?.colleges?.city || '').toLowerCase()
        return profileCity === cityLower || collegeCity === cityLower
      })
    }

    if (universityIdNum) {
      filtered = filtered.filter((profile: any) => {
        const collegeId = profile.college_info?.[0]?.college_id
        return Number(collegeId) === universityIdNum
      })
    }

    const totalFiltered = filtered.length
    const paged = filtered.slice(offsetNum, offsetNum + limitNum)

    // Transform response to flatten skills
    const transformed = paged.map((profile: any) => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      city: profile.city,
      role: profile.role,
      bio: profile.bio,
      linkedin_url: profile.linkedin_url,
      github_url: profile.github_url,
      portfolio_url: profile.portfolio_url,
      avatar_url: profile.avatar_url,
      skills: profile.user_skills.map((us: any) => us.skills),
      college_info: profile.college_info,
    }))

    return res.status(200).json({
      data: transformed,
      count: transformed.length,
      total: totalFiltered,
      limit: limitNum,
      offset: offsetNum,
    })
  } catch (error: any) {
    console.error('Handler error:', error)
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error' })
  }
}
