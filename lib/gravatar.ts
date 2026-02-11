import crypto from 'crypto'

// Gravatar helper functions
export function getGravatarUrl(email: string, size: number = 200): string {
  // Normalize email (lowercase, trim spaces)
  const normalizedEmail = email.toLowerCase().trim()
  
  // Create MD5 hash of the normalized email
  const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex')
  
  // Build Gravatar URL with parameters
  const params = new URLSearchParams({
    s: size.toString(),           // Size
    d: 'identicon',              // Default avatar style
    r: 'pg',                     // Rating (PG)
  })
  
  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`
}

export function getGoogleProfilePicture(user: any): string | null {
  // Try to get Google profile picture from user metadata
  if (user?.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url
  }
  
  // Try to get Google profile picture from identities
  if (user?.identities) {
    const googleIdentity = user.identities.find((identity: any) => identity.provider === 'google')
    if (googleIdentity?.identity_data?.picture) {
      return googleIdentity.identity_data.picture
    }
  }
  
  return null
}

export function getProfilePicture(user: any, size: number = 200): string {
  // First try Google profile picture
  const googlePicture = getGoogleProfilePicture(user)
  if (googlePicture) {
    return googlePicture
  }
  
  // Fall back to Gravatar if email is available
  if (user?.email) {
    return getGravatarUrl(user.email, size)
  }
  
  // Return default placeholder
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.first_name || 'User')}&size=${size}&background=3b82f6&color=ffffff`
}

export function syncProfilePicture(user: any): string | null {
  // Get the best available profile picture
  const profilePicture = getProfilePicture(user)
  
  // Return the URL for storage
  return profilePicture
}
