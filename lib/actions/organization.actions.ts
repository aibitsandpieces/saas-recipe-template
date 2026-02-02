"use server"

import { requirePlatformAdmin, requireUserWithOrg } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  Organization,
  User,
  OrganizationWithStats,
  organizationSchema,
  updateOrganizationSchema,
} from "@/lib/types/organization"

/**
 * Get all organizations with stats (platform admin only)
 */
export async function getOrganizationsWithStats(): Promise<OrganizationWithStats[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // Get organizations with user and enrollment counts
  const { data: orgs, error } = await supabase
    .from("organisations")
    .select(`
      *,
      users(count),
      course_org_enrollments(count)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching organizations:", error)
    throw new Error("Failed to fetch organizations")
  }

  // Transform the data to match our interface
  return orgs.map(org => ({
    ...org,
    _count: {
      users: org.users?.[0]?.count || 0,
      course_enrollments: org.course_org_enrollments?.[0]?.count || 0,
    }
  }))
}

/**
 * Get organization by ID (platform admin only)
 */
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: org, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", organizationId)
    .single()

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
    console.error("Error fetching organization:", error)
    throw new Error("Failed to fetch organization")
  }

  return org || null
}

/**
 * Create a new organization (platform admin only)
 */
export async function createOrganization(data: z.infer<typeof organizationSchema>): Promise<Organization> {
  const user = await requirePlatformAdmin()

  // Validate input
  const validatedData = organizationSchema.parse(data)

  const supabase = await createSupabaseClient()

  // Check if organization name already exists
  const { data: existingOrg } = await supabase
    .from("organisations")
    .select("id")
    .eq("name", validatedData.name)
    .single()

  if (existingOrg) {
    throw new Error("An organization with this name already exists")
  }

  const { data: newOrg, error } = await supabase
    .from("organisations")
    .insert({
      name: validatedData.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating organization:", error)
    throw new Error("Failed to create organization")
  }

  // Revalidate admin pages
  revalidatePath("/admin/organizations")
  revalidatePath("/admin/courses")

  return newOrg
}

/**
 * Update an organization (platform admin only)
 */
export async function updateOrganization(data: z.infer<typeof updateOrganizationSchema>): Promise<Organization> {
  await requirePlatformAdmin()

  // Validate input
  const validatedData = updateOrganizationSchema.parse(data)

  const supabase = await createSupabaseClient()

  // Check if the organization exists
  const { data: existingOrg } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("id", validatedData.id)
    .single()

  if (!existingOrg) {
    throw new Error("Organization not found")
  }

  // Check if new name conflicts with another organization (if name is changing)
  if (validatedData.name !== existingOrg.name) {
    const { data: conflictingOrg } = await supabase
      .from("organisations")
      .select("id")
      .eq("name", validatedData.name)
      .neq("id", validatedData.id)
      .single()

    if (conflictingOrg) {
      throw new Error("An organization with this name already exists")
    }
  }

  const { data: updatedOrg, error } = await supabase
    .from("organisations")
    .update({
      name: validatedData.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validatedData.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating organization:", error)
    throw new Error("Failed to update organization")
  }

  // Revalidate admin pages
  revalidatePath("/admin/organizations")
  revalidatePath("/admin/courses")

  return updatedOrg
}

/**
 * Delete an organization (platform admin only)
 * Note: This will check for dependencies and prevent deletion if users or enrollments exist
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // Check if organization exists
  const { data: organization } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("id", organizationId)
    .single()

  if (!organization) {
    throw new Error("Organization not found")
  }

  // Check for users in this organization
  const { count: userCount, error: userCountError } = await supabase
    .from("users")
    .select("id", { count: "exact" })
    .eq("organisation_id", organizationId)

  if (userCountError) {
    console.error("Error checking user count:", userCountError)
    throw new Error("Failed to check organization dependencies")
  }

  if (userCount && userCount > 0) {
    throw new Error(`Cannot delete organization: ${userCount} user(s) are still members. Please reassign or remove users first.`)
  }

  // Check for course enrollments
  const { count: enrollmentCount, error: enrollmentCountError } = await supabase
    .from("course_org_enrollments")
    .select("id", { count: "exact" })
    .eq("organisation_id", organizationId)

  if (enrollmentCountError) {
    console.error("Error checking enrollment count:", enrollmentCountError)
    throw new Error("Failed to check organization dependencies")
  }

  if (enrollmentCount && enrollmentCount > 0) {
    throw new Error(`Cannot delete organization: ${enrollmentCount} course enrollment(s) exist. Please remove enrollments first.`)
  }

  // Safe to delete
  const { error } = await supabase
    .from("organisations")
    .delete()
    .eq("id", organizationId)

  if (error) {
    console.error("Error deleting organization:", error)
    throw new Error("Failed to delete organization")
  }

  // Revalidate admin pages
  revalidatePath("/admin/organizations")
  revalidatePath("/admin/courses")
}

/**
 * Get users in an organization (platform admin only)
 */
export async function getOrganizationUsers(organizationId: string): Promise<User[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("organisation_id", organizationId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching organization users:", error)
    throw new Error("Failed to fetch organization users")
  }

  return users || []
}

/**
 * Transfer user to different organization (platform admin only)
 */
export async function transferUserToOrganization(
  userId: string,
  newOrganizationId: string
): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // Validate that both user and organization exist
  const [userCheck, orgCheck] = await Promise.all([
    supabase.from("users").select("id").eq("id", userId).single(),
    supabase.from("organisations").select("id").eq("id", newOrganizationId).single()
  ])

  if (!userCheck.data) {
    throw new Error("User not found")
  }

  if (!orgCheck.data) {
    throw new Error("Target organization not found")
  }

  // Update user's organization
  const { error } = await supabase
    .from("users")
    .update({
      organisation_id: newOrganizationId,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)

  if (error) {
    console.error("Error transferring user:", error)
    throw new Error("Failed to transfer user to new organization")
  }

  // Revalidate admin pages
  revalidatePath("/admin/organizations")
}