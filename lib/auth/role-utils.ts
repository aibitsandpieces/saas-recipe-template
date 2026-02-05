import { UserContext } from './user'

/**
 * Utility functions for consistent role checking across client and server
 */
export function hasRole(user: UserContext | null, role: string): boolean {
  return user?.roles?.includes(role) || false
}

export function isPlatformAdmin(user: UserContext | null): boolean {
  return hasRole(user, 'platform_admin')
}

export function isOrgAdmin(user: UserContext | null): boolean {
  return hasRole(user, 'org_admin')
}

export function isAdmin(user: UserContext | null): boolean {
  return isPlatformAdmin(user) || isOrgAdmin(user)
}

/**
 * Get primary role for display purposes
 */
export function getPrimaryRole(user: UserContext | null): string {
  if (!user?.roles?.length) return 'org_member'

  // Priority order: platform_admin > org_admin > org_member
  if (user.roles.includes('platform_admin')) return 'platform_admin'
  if (user.roles.includes('org_admin')) return 'org_admin'
  return 'org_member'
}