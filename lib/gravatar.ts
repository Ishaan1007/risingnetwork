// Gravatar helper functions
export function getGravatarUrl(email: string, size: number = 200): string {
  // Normalize email (lowercase, trim spaces)
  const normalizedEmail = email.toLowerCase().trim()
  
  // Create MD5 hash of the normalized email
  const hash = md5(normalizedEmail)
  
  // Build Gravatar URL with parameters
  const params = new URLSearchParams({
    s: size.toString(),           // Size
    d: 'identicon',              // Default avatar style
    r: 'pg',                     // Rating (PG)
  })
  
  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`
}

function md5(input: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }

  function addUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000
    const lY4 = lY & 0x40000000
    const lX8 = lX & 0x80000000
    const lY8 = lY & 0x80000000
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8
      return lResult ^ 0x40000000 ^ lX8 ^ lY8
    }
    return lResult ^ lX8 ^ lY8
  }

  function f(x: number, y: number, z: number) {
    return (x & y) | (~x & z)
  }
  function g(x: number, y: number, z: number) {
    return (x & z) | (y & ~z)
  }
  function h(x: number, y: number, z: number) {
    return x ^ y ^ z
  }
  function i(x: number, y: number, z: number) {
    return y ^ (x | ~z)
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(str: string) {
    const lWordCount: number[] = []
    let lMessageLength = str.length
    let lNumberOfWordsTempOne = lMessageLength + 8
    let lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64
    const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      const lWordCountIndex = (lByteCount - (lByteCount % 4)) / 4
      lWordCount[lWordCountIndex] = lWordCount[lWordCountIndex] || 0
      lWordCount[lWordCountIndex] |= str.charCodeAt(lByteCount) << ((lByteCount % 4) * 8)
      lByteCount++
    }
    const lWordCountIndex = (lByteCount - (lByteCount % 4)) / 4
    lWordCount[lWordCountIndex] = lWordCount[lWordCountIndex] || 0
    lWordCount[lWordCountIndex] |= 0x80 << ((lByteCount % 4) * 8)
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordCount
  }

  function wordToHex(lValue: number) {
    let wordToHexValue = ''
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255
      const wordToHexValueTemp = '0' + lByte.toString(16)
      wordToHexValue += wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2)
    }
    return wordToHexValue
  }

  let x = convertToWordArray(input)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  for (let k = 0; k < x.length; k += 16) {
    const aa = a
    const bb = b
    const cc = c
    const dd = d
    a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478)
    d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756)
    c = ff(c, d, a, b, x[k + 2], 17, 0x242070db)
    b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee)
    a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf)
    d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a)
    c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613)
    b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501)
    a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8)
    d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af)
    c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1)
    b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be)
    a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122)
    d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193)
    c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e)
    b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821)
    a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562)
    d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340)
    c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51)
    b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d)
    d = gg(d, a, b, c, x[k + 10], 9, 0x02441453)
    c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681)
    b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6)
    d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6)
    c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87)
    b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed)
    a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905)
    d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8)
    c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9)
    b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a)
    a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942)
    d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681)
    c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122)
    b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c)
    a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44)
    d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9)
    c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60)
    b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70)
    a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6)
    d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa)
    c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085)
    b = hh(b, c, d, a, x[k + 6], 23, 0x04881d05)
    a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039)
    d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5)
    c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8)
    b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665)
    a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244)
    d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97)
    c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7)
    b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039)
    a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3)
    d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92)
    c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d)
    b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1)
    a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f)
    d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0)
    c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314)
    b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1)
    a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82)
    d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235)
    c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb)
    b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391)
    a = addUnsigned(a, aa)
    b = addUnsigned(b, bb)
    c = addUnsigned(c, cc)
    d = addUnsigned(d, dd)
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
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
