import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { detectStaleJWT } from "./jwt-refresh";
import { AuthenticationError } from "./auth-errors";

/**
 * User context interface containing all relevant user information
 * and organisation context for the current session
 */
export interface UserContext {
  id: string;
  clerkId: string;
  organisationId: string | null;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

/**
 * Organisation interface for current user's organisation
 */
export interface Organisation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current authenticated user's context including roles and organisation
 * Returns null if user is not authenticated
 */
export async function getCurrentUser(): Promise<UserContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createSupabaseClient();

  // Step 1: Get basic user data (safe query, no nested relationships)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(`
      id,
      clerk_id,
      organisation_id,
      email,
      name,
      first_name,
      last_name
    `)
    .eq("clerk_id", userId)
    .single();

  if (userError || !userData) {
    // Enhanced diagnostic logging
    console.error("Error fetching user - DETAILED:", {
      error: userError,
      userId,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      errorDetails: userError?.details,
      errorHint: userError?.hint,
      dataReturned: userData,
      timestamp: new Date().toISOString()
    });

    // Add specific error type detection
    if (userError?.code === 'PGRST116') {
      console.warn('User sync issue detected: User exists in Clerk but not in Supabase database');
      console.warn('This is a known issue in localhost development - check CLAUDE.md for details');
    }

    return null;
  }

  // Step 2: Get user roles separately to avoid RLS circular reference
  let roles: string[] = [];
  try {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select(`role:roles(name)`)
      .eq("user_id", userData.id);

    if (roleError) {
      console.warn("Could not fetch user roles:", {
        error: roleError,
        userId: userData.id,
        message: roleError.message
      });
      // Continue with empty roles - user can still authenticate
    } else {
      roles = roleData?.map((ur: any) => ur.role?.name).filter(Boolean) || [];
    }
  } catch (roleError) {
    console.warn("Exception fetching user roles:", roleError);
    // Continue with empty roles - user can still authenticate
  }

  return {
    id: userData.id,
    clerkId: userData.clerk_id,
    organisationId: userData.organisation_id,
    email: userData.email,
    name: userData.name,
    firstName: userData.first_name,
    lastName: userData.last_name,
    roles: roles
  };
}

/**
 * Enhanced getCurrentUser with stale JWT detection and fallback
 */
export async function getCurrentUserWithFallback(): Promise<UserContext | null> {
  const user = await getCurrentUser()

  if (!user) return null

  // Get Clerk user for comparison
  try {
    const { userId } = await auth()
    if (userId) {
      try {
        const clerk = await clerkClient()
        const clerkUser = await clerk.users.getUser(userId)
        const clerkRole = clerkUser.publicMetadata?.role as string

        // Detect potential stale JWT
        if (clerkRole && detectStaleJWT(clerkRole, user.roles)) {
          console.warn(`Potential stale JWT detected. Clerk role: ${clerkRole}, DB roles: ${user.roles.join(', ')}`)

          // For now, trust the database roles but log the discrepancy
          // Future enhancement: implement proper token refresh or user re-authentication
          return {
            ...user,
            // Add metadata about staleness for debugging
            _metadata: {
              staleJWT: true,
              clerkRole,
              lastChecked: new Date().toISOString()
            }
          } as UserContext & { _metadata?: any }
        }
      } catch (clerkError) {
        console.warn('Failed to get Clerk user for staleness check:', clerkError)
        // Continue without staleness detection
      }
    }
  } catch (error) {
    console.error('Error checking JWT staleness:', error)
  }

  return user
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.roles.includes(roleName) || false;
}

/**
 * Check if the current user is a platform administrator
 */
export async function isPlatformAdmin(): Promise<boolean> {
  return hasRole("platform_admin");
}

/**
 * Check if the current user is an organisation administrator
 */
export async function isOrgAdmin(): Promise<boolean> {
  return hasRole("org_admin");
}

/**
 * Check if the current user is an organisation member (any role within an org)
 */
export async function isOrgMember(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user?.organisationId);
}

/**
 * Get the current user's organisation details
 * Returns null if user is not assigned to an organisation
 */
export async function getCurrentOrganisation(): Promise<Organisation | null> {
  const user = await getCurrentUser();
  if (!user?.organisationId) return null;

  const supabase = await createSupabaseClient();

  const { data: org, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", user.organisationId)
    .single();

  if (error) {
    console.error("Error fetching organisation:", error);
    return null;
  }

  return org;
}

/**
 * Get user context with organisation validation
 * Throws error if user is not authenticated or not assigned to an organisation
 */
export async function requireUserWithOrg(): Promise<{
  user: UserContext;
  organisationId: string;
}> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  if (!user.organisationId) {
    throw new Error("Forbidden: User not assigned to organisation");
  }

  return {
    user,
    organisationId: user.organisationId
  };
}

/**
 * Require platform admin privileges
 * Throws error if user is not a platform admin
 */
export async function requirePlatformAdmin(): Promise<UserContext> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  if (!user.roles.includes("platform_admin")) {
    throw new Error("Forbidden: Platform admin privileges required");
  }

  return user;
}

/**
 * Require organisation admin privileges with enhanced error handling
 */
export async function requireOrgAdmin(): Promise<{
  user: UserContext;
  organisationId: string;
}> {
  const { user, organisationId } = await requireUserWithOrg();

  const hasOrgAdmin = user.roles.includes("org_admin")
  const hasPlatformAdmin = user.roles.includes("platform_admin")

  if (!hasOrgAdmin && !hasPlatformAdmin) {
    // Check for potential stale JWT
    try {
      const { userId } = await auth()
      if (userId) {
        try {
          const clerk = await clerkClient()
          const clerkUser = await clerk.users.getUser(userId)
          const clerkRole = clerkUser.publicMetadata?.role as string

          if ((clerkRole === 'org_admin' || clerkRole === 'platform_admin') &&
              !user.roles.includes(clerkRole)) {
            throw new AuthenticationError(
              'Access denied due to stale authentication token. Please sign out and sign back in.',
              'STALE_JWT',
              {
                clerkRole,
                databaseRoles: user.roles,
                userId: user.clerkId
              }
            )
          }
        } catch (clerkError) {
          console.warn('Failed to get Clerk user for stale JWT check:', clerkError)
          // Continue without stale JWT detection
        }
      }
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      console.error('Error checking stale JWT in requireOrgAdmin:', error)
    }

    throw new AuthenticationError(
      'Forbidden: Organisation admin privileges required',
      'INSUFFICIENT_PRIVILEGES',
      {
        userRoles: user.roles,
        requiredRoles: ['org_admin', 'platform_admin']
      }
    )
  }

  return { user, organisationId };
}

/**
 * Get all users in the current user's organisation
 * Requires org admin or platform admin privileges
 */
export async function getOrganisationUsers(): Promise<UserContext[]> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Platform admins can specify which org, for now assume current user's org
  const orgId = user.organisationId;
  if (!orgId) {
    throw new Error("Forbidden: User not assigned to organisation");
  }

  // Check permissions
  const isAdmin = user.roles.includes("platform_admin") || user.roles.includes("org_admin");
  if (!isAdmin) {
    throw new Error("Forbidden: Admin privileges required");
  }

  const supabase = await createSupabaseClient();

  // Step 1: Get basic user data
  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id,
      clerk_id,
      organisation_id,
      email,
      name,
      first_name,
      last_name
    `)
    .eq("organisation_id", orgId);

  if (error) {
    console.error("Error fetching organisation users:", error);
    throw new Error("Failed to fetch organisation users");
  }

  if (!users) return [];

  // Step 2: Get roles for all users in a single query
  const userIds = users.map(u => u.id);
  const { data: roleData } = await supabase
    .from("user_roles")
    .select(`user_id, role:roles(name)`)
    .in("user_id", userIds);

  // Create a map of user_id -> roles for efficient lookup
  const rolesMap = new Map<string, string[]>();
  roleData?.forEach((ur: any) => {
    const userId = ur.user_id;
    const roleName = ur.role?.name;
    if (roleName) {
      if (!rolesMap.has(userId)) {
        rolesMap.set(userId, []);
      }
      rolesMap.get(userId)!.push(roleName);
    }
  });

  return users.map(user => ({
    id: user.id,
    clerkId: user.clerk_id,
    organisationId: user.organisation_id,
    email: user.email,
    name: user.name,
    firstName: user.first_name,
    lastName: user.last_name,
    roles: rolesMap.get(user.id) || []
  }));
}