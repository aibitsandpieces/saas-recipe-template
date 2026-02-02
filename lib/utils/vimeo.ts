/**
 * Parse a Vimeo URL and extract video ID and other parameters
 */
export function parseVimeoUrl(url: string): {
  videoId: string | null
  hash: string | null
  embedUrl: string | null
} {
  if (!url) return { videoId: null, hash: null, embedUrl: null }

  // Handle direct video ID input (backward compatibility)
  if (/^\d+$/.test(url.trim())) {
    return {
      videoId: url.trim(),
      hash: null,
      embedUrl: `https://player.vimeo.com/video/${url.trim()}`
    }
  }

  // Parse various Vimeo URL formats
  const patterns = [
    // https://vimeo.com/123456789/abcdef123?params
    /vimeo\.com\/(\d+)\/([a-f0-9]+)/,
    // https://vimeo.com/123456789?params
    /vimeo\.com\/(\d+)/,
    // https://player.vimeo.com/video/123456789?params
    /player\.vimeo\.com\/video\/(\d+)/
  ]

  let videoId: string | null = null
  let hash: string | null = null

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      videoId = match[1]
      hash = match[2] || null
      break
    }
  }

  if (!videoId) {
    return { videoId: null, hash: null, embedUrl: null }
  }

  // Build embed URL
  let embedUrl = `https://player.vimeo.com/video/${videoId}`
  const urlObj = new URL(url)
  const params = new URLSearchParams()

  // Add hash parameter if present
  if (hash) {
    params.append('h', hash)
  }

  // Preserve important query parameters
  const preserveParams = ['fl', 'fe', 't'] // fl=ip, fe=ec, t=time
  for (const param of preserveParams) {
    const value = urlObj.searchParams.get(param)
    if (value) {
      params.append(param, value)
    }
  }

  if (params.toString()) {
    embedUrl += '?' + params.toString()
  }

  return { videoId, hash, embedUrl }
}

/**
 * Validate if a Vimeo URL or ID is valid
 */
export function isValidVimeoInput(input: string): boolean {
  if (!input) return true // Allow empty input

  // Check if it's just a video ID
  if (/^\d+$/.test(input.trim())) return true

  // Check if it's a valid Vimeo URL
  return /vimeo\.com\//.test(input)
}