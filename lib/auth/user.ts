import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";

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

  // Get basic user info
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, clerk_id, organisation_id, email, name")
    .eq("clerk_id", userId)
    .single();

  if (userError || !user) {
    console.error("Error fetching user:", userError);
    return null;
  }

  // Get user's role IDs
  const { data: userRoles, error: userRolesError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  if (userRolesError) {
    console.error("Error fetching user roles:", userRolesError);
    return {
      id: user.id,
      clerkId: user.clerk_id,
      organisationId: user.organisation_id,
      email: user.email,
      name: user.name,
      roles: []
    };
  }

  // Get role names
  let roles: string[] = [];
  if (userRoles && userRoles.length > 0) {
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roleData, error: rolesError } = await supabase
      .from("roles")
      .select("name")
      .in("id", roleIds);

    if (rolesError) {
      console.error("Error fetching role names:", rolesError);
    } else {
      roles = roleData?.map(r => r.name) || [];
    }
  }

  return {
    id: user.id,
    clerkId: user.clerk_id,
    organisationId: user.organisation_id,
    email: user.email,
    name: user.name,
    roles: roles
  };
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
 * Require organisation admin privileges
 * Throws error if user is not an org admin
 */
export async function requireOrgAdmin(): Promise<{
  user: UserContext;
  organisationId: string;
}> {
  const { user, organisationId } = await requireUserWithOrg();

  if (!user.roles.includes("org_admin")) {
    throw new Error("Forbidden: Organisation admin privileges required");
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

  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id,
      clerk_id,
      organisation_id,
      email,
      name,
      user_roles(role:roles(name))
    `)
    .eq("organisation_id", orgId);

  if (error) {
    console.error("Error fetching organisation users:", error);
    throw new Error("Failed to fetch organisation users");
  }

  return users?.map(user => ({
    id: user.id,
    clerkId: user.clerk_id,
    organisationId: user.organisation_id,
    email: user.email,
    name: user.name,
    roles: user.user_roles?.map((ur: any) => ur.role?.name) || []
  })) || [];
}