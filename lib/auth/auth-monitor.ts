import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserContext } from './user';
import { detectStaleJWT } from './jwt-refresh';

/**
 * Authentication monitoring and diagnostic utilities
 */
export interface AuthDiagnostics {
  userId: string
  clerkRole?: string
  databaseRoles: string[]
  organisationId?: string
  jwtStale: boolean
  timestamp: string
}

/**
 * Collect authentication diagnostics for debugging
 */
export async function collectAuthDiagnostics(
  user: UserContext
): Promise<AuthDiagnostics> {
  let clerkRole: string | undefined
  let jwtStale = false

  try {
    const { userId } = await auth()
    if (userId) {
      try {
        const clerk = await clerkClient()
        const clerkUser = await clerk.users.getUser(userId)
        clerkRole = clerkUser.publicMetadata?.role as string
        jwtStale = detectStaleJWT(clerkRole || '', user.roles)
      } catch (clerkError) {
        console.warn('Failed to get Clerk user data for diagnostics:', clerkError)
        // Continue without Clerk role comparison
      }
    }
  } catch (error) {
    console.error('Error collecting auth diagnostics:', error)
  }

  return {
    userId: user.clerkId,
    clerkRole,
    databaseRoles: [...user.roles], // Copy array
    organisationId: user.organisationId || undefined,
    jwtStale,
    timestamp: new Date().toISOString()
  }
}

/**
 * Log authentication state for debugging
 */
export async function logAuthState(
  context: string,
  user: UserContext | null
): Promise<void> {
  if (!user) {
    console.log(`[AUTH ${context}] No authenticated user`)
    return
  }

  const diagnostics = await collectAuthDiagnostics(user)

  console.log(`[AUTH ${context}]`, {
    user: user.name || user.email,
    ...diagnostics
  })

  if (diagnostics.jwtStale) {
    console.warn(`[AUTH ${context}] STALE JWT DETECTED`, diagnostics)
  }
}