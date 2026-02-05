import { auth } from '@clerk/nextjs/server'

/**
 * Attempt to get a fresh JWT token
 * Note: Clerk's getToken() may still return cached tokens,
 * but this provides a centralized place for token handling
 */
export async function getFreshToken(): Promise<string | null> {
  try {
    const { getToken } = await auth()

    // Force token refresh by requesting with template 'supabase'
    // This may help in some cases but won't solve fundamental caching
    return await getToken({
      template: 'supabase'
    })
  } catch (error) {
    console.error('Error getting fresh token:', error)
    return null
  }
}

/**
 * Check if JWT token appears stale based on role mismatch
 */
export function detectStaleJWT(
  clerkRole: string,
  databaseRoles: string[]
): boolean {
  // If Clerk says user is org_admin but DB query only returned org_member roles,
  // likely indicates stale JWT in RLS filtering
  if (clerkRole === 'org_admin' && !databaseRoles.includes('org_admin')) {
    return true
  }

  if (clerkRole === 'platform_admin' && !databaseRoles.includes('platform_admin')) {
    return true
  }

  return false
}