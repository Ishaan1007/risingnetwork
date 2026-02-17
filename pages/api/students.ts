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
    const { college, skills, limit = '10', offset = '0' } = req.query

    const limitNum = Math.min(parseInt(limit as string) || 10, 100)
    const offsetNum = parseInt(offset as string) || 0
    const skillIds = skills
      ? (skills as string).split(',').map(Number).filter(Boolean)
      : []

    // Base query: get students with their skills and college info
    let query = supabaseServer
      .from('profiles')
      .select(
        `
        id,
        name,
        role,
        bio,
        linkedin_url,
        github_url,
        portfolio_url,
        avatar_url,
        college_info (
          college_id,
          major,
          graduation_year,
          colleges (
            id,
            name,
            city,
            state_province
          )
        ),
        user_skills (
          skill_id,
          skills (
            id,
            name,
            category
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('role', 'student')

    // Filter by college if provided
    if (college) {
      // college is college_id (numeric)
      query = query.eq('college_info.college_id', parseInt(college as string))
    }

    const { data, error } = await query

    if (error) {
      console.error('Student fetch error:', error)
      return res.status(500).json({
        error: `Failed to fetch students: ${error.message}`,
      })
    }

    // Filter by skills on the result
    let filtered = data || []
    if (skillIds.length > 0) {
      filtered = filtered.filter((profile: any) => {
        const profileSkillIds = profile.user_skills.map(
          (us: any) => us.skill_id
        )
        return skillIds.some((id) => profileSkillIds.includes(id))
      })
    }
    const totalFiltered = filtered.length
    const paged = filtered.slice(offsetNum, offsetNum + limitNum)

    // Transform response to flatten skills and college info
    const transformed = paged.map((profile: any) => {
      const collegeInfo = profile.college_info?.[0]
      return {
        id: profile.id,
        name: profile.name,
        bio: profile.bio,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        portfolio_url: profile.portfolio_url,
        avatar_url: profile.avatar_url,
        college: collegeInfo?.colleges
          ? {
              id: collegeInfo.colleges.id,
              name: collegeInfo.colleges.name,
              city: collegeInfo.colleges.city,
            }
          : null,
        major: collegeInfo?.major || null,
        graduation_year: collegeInfo?.graduation_year || null,
        skills: profile.user_skills.map((us: any) => us.skills),
      }
    })

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
