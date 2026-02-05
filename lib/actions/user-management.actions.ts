"use server"

import { createSupabaseClient } from "@/lib/supabase"
import { createSupabaseAdmin } from "@/lib/supabase-admin"
import { requireUserWithOrg, requirePlatformAdmin, requireOrgAdmin } from "@/lib/auth/user"
import { clerkClient } from "@clerk/nextjs/server"
import { z } from "zod"
import { toTitleCase } from "@/lib/utils"
import {
  CSVUserRow,
  UserImportPreviewResult,
  UserImportError,
  UserWithRole,
  UserInvitation,
  UserSearchFilters,
  UserSearchResult,
  CourseUserEnrollment,
  UserImportLog,
  CreateUserInvitation
} from "@/types"

// Validation schemas
const UserRoleSchema = z.enum(['org_admin', 'org_member', 'platform_admin'])

const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  newRole: UserRoleSchema
})

const UserSearchFiltersSchema = z.object({
  query: z.string().optional(),
  organisationId: z.string().uuid("Invalid organisation ID format").optional(),
  role: UserRoleSchema.optional(),
  invitationStatus: z.enum(['all', 'pending', 'accepted', 'expired']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
})

const InviteUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().optional(),
  organisationId: z.string().uuid("Invalid organisation ID format"),
  role: UserRoleSchema,
  courseIds: z.array(z.string().uuid("Invalid course ID format")).optional()
})

/**
 * Preview user CSV import data and validate before execution
 */
export async function previewUserImport(csvData: CSVUserRow[]): Promise<UserImportPreviewResult> {
  const user = await requirePlatformAdmin()  // CHANGE: Require platform admin for org creation
  const supabase = await createSupabaseClient()

  const errors: UserImportError[] = []
  let validRows = 0
  const summary = {
    usersToInvite: 0,
    organisationsFound: [] as string[],
    coursesFound: [] as string[],
    rolesAssigned: {} as { [role: string]: number },
    duplicateEmails: [] as string[]
  }


  // Track emails to detect duplicates within CSV
  const emailSet = new Set<string>()

  // Get existing organisations and courses for validation
  const { data: organisations } = await supabase
    .from("organisations")
    .select("id, name")

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .eq("is_published", true)

  const orgMap = new Map(organisations?.map(org => [org.name.toLowerCase(), org]) || [])
  const courseMap = new Map(courses?.map(course => [course.name.toLowerCase(), course]) || [])

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i]
    const rowNum = i + 2 // Account for header row

    let rowValid = true

    // Validate email
    if (!row.email?.trim()) {
      errors.push({ row: rowNum, field: 'email', message: 'Email is required', value: row.email })
      rowValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
      errors.push({ row: rowNum, field: 'email', message: 'Invalid email format', value: row.email })
      rowValid = false
    } else {
      const email = row.email.toLowerCase().trim()
      if (emailSet.has(email)) {
        errors.push({ row: rowNum, field: 'email', message: 'Duplicate email in CSV', value: row.email })
        summary.duplicateEmails.push(email)
        rowValid = false
      } else {
        emailSet.add(email)
      }
    }

    // Validate name
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required', value: row.name })
      rowValid = false
    }

    // Validate role
    if (!row.role || !['org_admin', 'org_member'].includes(row.role)) {
      errors.push({ row: rowNum, field: 'role', message: 'Role must be org_admin or org_member', value: row.role })
      rowValid = false
    } else {
      summary.rolesAssigned[row.role] = (summary.rolesAssigned[row.role] || 0) + 1
    }

    // Validate organisation
    if (!row.organisation?.trim()) {
      errors.push({ row: rowNum, field: 'organisation', message: 'Organisation is required', value: row.organisation })
      rowValid = false
    } else {
      const orgKey = row.organisation.toLowerCase().trim()
      const org = orgMap.get(orgKey)

      if (!org) {
        errors.push({
          row: rowNum,
          field: 'organisation',
          message: `Organisation not found: ${row.organisation}. Please use exact organisation name.`,
          value: row.organisation
        })
        rowValid = false
      } else {
        // Existing organization
        if (!summary.organisationsFound.includes(org.name)) {
          summary.organisationsFound.push(org.name)
        }
      }
    }

    // Validate courses (optional)
    if (row.courses?.trim()) {
      const courseNames = row.courses.split(',').map(name => name.trim()).filter(Boolean)
      for (const courseName of courseNames) {
        const course = courseMap.get(courseName.toLowerCase())
        if (!course) {
          errors.push({ row: rowNum, field: 'courses', message: `Course not found: ${courseName}`, value: courseName })
          rowValid = false
        } else if (!summary.coursesFound.includes(course.name)) {
          summary.coursesFound.push(course.name)
        }
      }
    }

    if (rowValid) {
      validRows++
      summary.usersToInvite++
    }
  }


  return {
    isValid: errors.length === 0,
    totalRows: csvData.length,
    validRows,
    errors,
    summary,
    sampleData: csvData.slice(0, 5) // Show first 5 rows as sample
  }
}

/**
 * Execute user CSV import with Clerk invitation creation
 */
export async function executeUserImport(csvData: CSVUserRow[], fileName: string): Promise<UserImportLog> {
  const user = await requirePlatformAdmin()  // CHANGE: Platform admin required
  const supabaseAdmin = createSupabaseAdmin()
  const clerk = await clerkClient()

  // Validate environment configuration
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')
  }

  // Re-validate data
  const preview = await previewUserImport(csvData)
  if (!preview.isValid) {
    throw new Error(`Import validation failed: ${preview.errors.length} errors found`)
  }

  const importLog: UserImportLog = {
    file_name: fileName,
    total_rows: csvData.length,
    successful_invitations: 0,
    failed_invitations: 0,
    organisations_processed: 0,
    individual_enrollments: 0,
    imported_by: user.id, // Fixed: Use user.id (UUID) instead of user.clerkId (string)
    started_at: new Date().toISOString(),
    existing_invitations_cleaned: 0 // NEW: Track cleaned up duplicates
  }

  try {

    // Get reference data (now includes newly created ones)
    const { data: organisations } = await supabaseAdmin
      .from("organisations")
      .select("id, name")

    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, name")
      .eq("is_published", true)

    const orgMap = new Map(organisations?.map(org => [org.name.toLowerCase(), org]) || [])
    const courseMap = new Map(courses?.map(course => [course.name.toLowerCase(), course]) || [])
    const processedOrgs = new Set<string>()
    let totalIndividualEnrollments = 0

    // Process invitations in batches for better transaction handling
    const BATCH_SIZE = 10
    const batches: CSVUserRow[][] = []
    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      batches.push(csvData.slice(i, i + BATCH_SIZE))
    }

    const createdInvitations: { clerkId: string, supabaseId?: string }[] = []
    const failedInvitations: { email: string, error: string }[] = []
    let existingInvitationsCleanedCount = 0

    try {
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(async (row) => {
            const email = row.email.toLowerCase().trim()
            const org = orgMap.get(row.organisation.toLowerCase().trim())

            if (!org) {
              throw new Error(`Organisation not found: ${row.organisation}`)
            }

            processedOrgs.add(org.id)

            // Parse individual course enrollments
            const courseIds: string[] = []
            if (row.courses?.trim()) {
              const courseNames = row.courses.split(',').map(name => name.trim()).filter(Boolean)
              for (const courseName of courseNames) {
                const course = courseMap.get(courseName.toLowerCase())
                if (course) {
                  courseIds.push(course.id)
                  totalIndividualEnrollments++
                }
              }
            }

            // Check for existing Clerk invitations and revoke them first
            try {
              const existingClerkInvitations = await clerk.invitations.getInvitationList({
                status: 'pending'
              })

              // Filter by email address and revoke any existing invitations
              const matchingInvitations = existingClerkInvitations.data.filter(
                invitation => invitation.emailAddress === email
              )

              if (matchingInvitations.length > 0) {
                console.log(`Found ${matchingInvitations.length} existing invitation(s) for ${email}`)

                for (const existingInvitation of matchingInvitations) {
                  try {
                    await clerk.invitations.revokeInvitation(existingInvitation.id)
                    console.log(`Revoked existing invitation ${existingInvitation.id} for ${email}`)
                    existingInvitationsCleanedCount++
                  } catch (revokeError) {
                    console.error(`Failed to revoke invitation ${existingInvitation.id} for ${email}:`, revokeError)
                    // Continue anyway - might be already revoked
                  }
                }
              }
            } catch (checkError: any) {
              console.error(`Failed to check existing invitations for ${email}:`, checkError)
              // Continue anyway - this is not critical for the flow
            }

            // Clean up existing Supabase invitation records
            try {
              const { error: deleteError } = await supabaseAdmin
                .from("user_invitations")
                .delete()
                .eq("email", email)
                .eq("organisation_id", org.id)

              if (deleteError) {
                console.warn(`Warning: Failed to delete existing Supabase invitation for ${email}:`, deleteError)
                // Continue anyway - might not exist
              } else {
                console.log(`Cleaned up existing Supabase invitation records for ${email}`)
              }
            } catch (supabaseCleanupError) {
              console.warn(`Warning: Failed to cleanup Supabase invitations for ${email}:`, supabaseCleanupError)
              // Continue anyway - this is not critical for the flow
            }

            // Create Clerk invitation with metadata
            let clerkInvitation
            try {
              clerkInvitation = await clerk.invitations.createInvitation({
                emailAddress: email,
                publicMetadata: {
                  organisation_id: org.id,
                  role: row.role
                },
                redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/sign-up`
              })
            } catch (clerkError: any) {
              // Log detailed Clerk error information
              console.error(`Clerk invitation failed for ${email}:`, {
                status: clerkError.status,
                code: clerkError.code,
                message: clerkError.message,
                errors: clerkError.errors, // This will show the actual validation errors
                clerkTraceId: clerkError.clerkTraceId
              })

              // Create a more detailed error message
              let errorDetails = `Clerk API error (${clerkError.status})`
              if (clerkError.errors && Array.isArray(clerkError.errors)) {
                const errorMessages = clerkError.errors.map((err: any) => `${err.code}: ${err.message}`).join(', ')
                errorDetails = `${errorDetails}: ${errorMessages}`
              }

              throw new Error(`Failed to create Clerk invitation for ${email}: ${errorDetails}`)
            }

            // Validate Clerk invitation was created successfully
            if (!clerkInvitation || !clerkInvitation.id) {
              throw new Error(`Failed to create Clerk invitation for ${email}: No invitation ID returned`)
            }

            console.log(`Creating invitation for ${email} with status: pending`)
            console.log(`Clerk invitation ID: ${clerkInvitation.id}`)
            console.log(`Redirect URL: ${process.env.NEXT_PUBLIC_SITE_URL}/sign-up`)

            try {
              // Create invitation record in Supabase
              const { data: invitation, error: invitationError } = await supabaseAdmin
                .from("user_invitations")
                .insert({
                  email: email,
                  name: toTitleCase(row.name), // NEW: Store formatted name from CSV
                  organisation_id: org.id,
                  role_name: row.role,
                  status: 'pending',
                  clerk_invitation_id: clerkInvitation.id,
                  courses: courseIds,
                  invited_by: user.id,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                })
                .select('id, status')
                .single()

              if (invitationError) {
                // Clean up Clerk invitation if Supabase insert failed
                await clerk.invitations.revokeInvitation(clerkInvitation.id)
                throw new Error(`Failed to create invitation record: ${invitationError.message}`)
              }

              // Verify status was set correctly
              if (invitation && invitation.status !== 'pending') {
                console.warn(`Warning: Invitation ${invitation.id} has unexpected status: ${invitation.status}`)
              }

              return {
                email,
                clerkId: clerkInvitation.id,
                supabaseId: invitation.id,
                success: true
              }
            } catch (supabaseError) {
              // Ensure cleanup of Clerk invitation
              try {
                if (clerkInvitation && clerkInvitation.id) {
                  await clerk.invitations.revokeInvitation(clerkInvitation.id)
                }
              } catch (revokeError) {
                // Log but don't throw - cleanup failures shouldn't block the main error
                console.warn(`Warning: Failed to revoke Clerk invitation during cleanup for ${email}:`, revokeError)
              }
              throw supabaseError
            }
          })
        )

        // Process batch results
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i]
          const batchEmail = batch[i]?.email || 'unknown'

          if (result.status === 'fulfilled') {
            importLog.successful_invitations++
            createdInvitations.push({
              clerkId: result.value.clerkId,
              supabaseId: result.value.supabaseId
            })
          } else {
            console.error(`Batch invitation failed for ${batchEmail}:`, result.reason)
            importLog.failed_invitations++
            failedInvitations.push({
              email: batchEmail,
              error: result.reason?.message || 'Unknown error'
            })
          }
        }
      }
    } catch (batchError) {
      console.error("Critical error during batch processing:", batchError)

      // In case of critical failure, we should clean up any partially created invitations
      // This is a compensating action to maintain data consistency
      for (const invitation of createdInvitations) {
        try {
          // Revoke Clerk invitation
          await clerk.invitations.revokeInvitation(invitation.clerkId)

          // Delete Supabase invitation record if it exists
          if (invitation.supabaseId) {
            await supabaseAdmin
              .from("user_invitations")
              .delete()
              .eq("id", invitation.supabaseId)
          }
        } catch (cleanupError) {
          console.error(`Failed to cleanup invitation ${invitation.clerkId}:`, cleanupError)
        }
      }

      throw new Error("Import failed due to critical error. All invitations have been rolled back.")
    }

    importLog.organisations_processed = processedOrgs.size
    importLog.individual_enrollments = totalIndividualEnrollments
    importLog.existing_invitations_cleaned = existingInvitationsCleanedCount
    importLog.completed_at = new Date().toISOString()

    // Save import log
    const { error: logError } = await supabaseAdmin
      .from("user_import_logs")
      .insert({
        ...importLog,
        error_summary: importLog.failed_invitations > 0 ? {
          failed_count: importLog.failed_invitations,
          message: 'Some invitations failed to process',
          failed_emails: failedInvitations.map(f => `${f.email}: ${f.error}`).join('; ')
        } : null
      })

    if (logError) {
      console.error("Failed to save import log:", logError)
    }

    // If there were failures, add details to the import log for the UI
    if (failedInvitations.length > 0) {
      console.log("Failed invitations details:", failedInvitations)
      // Add failed invitation details to the return object for UI display
      ;(importLog as any).failedInvitationDetails = failedInvitations
    }

    return importLog

  } catch (error) {
    // Enhanced error handling for organization creation
    importLog.completed_at = new Date().toISOString()
    importLog.error_summary = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    }

    // Try to save error log if possible
    try {
      await supabaseAdmin
        .from("user_import_logs")
        .insert(importLog)
    } catch (logError) {
      console.error("Failed to save error import log:", logError)
    }

    throw error
  }
}

/**
 * Get users for admin dashboard with filtering and pagination
 */
export async function getUsersForAdmin(filters: UserSearchFilters = {}): Promise<UserSearchResult> {
  // Validate input filters
  const validatedFilters = UserSearchFiltersSchema.parse(filters)

  const user = await requirePlatformAdmin() // Fixed: Platform admin required for cross-org user management
  const supabase = await createSupabaseClient()

  const {
    query = '',
    organisationId,
    role,
    invitationStatus = 'all',
    page = 1,
    limit = 20
  } = filters

  const offset = (page - 1) * limit

  // Build user query (temporarily removed course enrollments due to relationship ambiguity)
  let userQuery = supabase
    .from("users")
    .select(`
      *,
      user_roles(role:roles(name)),
      organisation:organisations(name)
    `, { count: 'exact' })

  // Apply filters
  if (organisationId) {
    userQuery = userQuery.eq('organisation_id', organisationId)
  }

  if (query) {
    userQuery = userQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
  }

  // Get users with count
  const { data: users, error: usersError, count: userCount } = await userQuery
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`)
  }

  // Build invitation query
  let invitationQuery = supabase
    .from("user_invitations")
    .select(`
      *,
      inviter:users!invited_by(name),
      organisation:organisations(name)
    `, { count: 'exact' })

  if (organisationId) {
    invitationQuery = invitationQuery.eq('organisation_id', organisationId)
  }

  if (query) {
    invitationQuery = invitationQuery.ilike('email', `%${query}%`)
  }

  if (invitationStatus !== 'all') {
    invitationQuery = invitationQuery.eq('status', invitationStatus)
  }

  // Get invitations with count
  const { data: invitations, error: invitationsError, count: invitationCount } = await invitationQuery
    .range(offset, offset + limit - 1)
    .order('invited_at', { ascending: false })

  if (invitationsError) {
    throw new Error(`Failed to fetch invitations: ${invitationsError.message}`)
  }

  // Transform users data (course enrollments temporarily disabled due to query complexity)
  const transformedUsers: UserWithRole[] = (users || []).map(user => ({
    ...user,
    role: user.user_roles?.[0]?.role?.name || 'org_member',
    organisationName: user.organisation?.name,
    courseEnrollments: [] // TODO: Re-add course enrollments with proper relationship handling
  }))

  // Transform invitations data
  const transformedInvitations: UserInvitation[] = (invitations || []).map(invitation => ({
    ...invitation,
    inviterName: invitation.inviter?.name,
    organisationName: invitation.organisation?.name
  }))

  const totalPages = Math.ceil(((userCount || 0) + (invitationCount || 0)) / limit)

  return {
    users: transformedUsers,
    invitations: transformedInvitations,
    totalUserCount: userCount || 0,
    totalInvitationCount: invitationCount || 0,
    pagination: {
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }
}

/**
 * Invite a single user
 */
export async function inviteUser(invitation: CreateUserInvitation): Promise<UserInvitation> {
  // Validate input using Zod schema
  const validatedInvitation = InviteUserSchema.parse({
    email: invitation.email,
    name: invitation.name,
    organisationId: invitation.organisationId,
    role: invitation.role,
    courseIds: invitation.courseIds
  })

  const { user } = await requireOrgAdmin() // Changed to require admin privileges
  const supabaseAdmin = createSupabaseAdmin()
  const clerk = await clerkClient()

  // Validate environment configuration
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')
  }

  try {

    // Check if user already exists or has pending invitation
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", invitation.email.toLowerCase())
      .single()

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const { data: existingInvitation } = await supabaseAdmin
      .from("user_invitations")
      .select("id, status")
      .eq("email", invitation.email.toLowerCase())
      .eq("organisation_id", invitation.organisationId)
      .single()

    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new Error('User already has a pending invitation')
    }

    // Check for existing Clerk invitations and revoke them first
    try {
      const existingClerkInvitations = await clerk.invitations.getInvitationList({
        status: 'pending'
      })

      // Filter by email address and revoke any existing invitations
      const matchingInvitations = existingClerkInvitations.data.filter(
        existing => existing.emailAddress === invitation.email
      )

      if (matchingInvitations.length > 0) {
        console.log(`Found ${matchingInvitations.length} existing invitation(s) for ${invitation.email}`)

        for (const existingInvitation of matchingInvitations) {
          try {
            await clerk.invitations.revokeInvitation(existingInvitation.id)
            console.log(`Revoked existing invitation ${existingInvitation.id} for ${invitation.email}`)
          } catch (revokeError) {
            console.error(`Failed to revoke invitation ${existingInvitation.id} for ${invitation.email}:`, revokeError)
            // Continue anyway - might be already revoked
          }
        }
      }
    } catch (checkError: any) {
      console.error(`Failed to check existing invitations for ${invitation.email}:`, checkError)
      // Continue anyway - this is not critical for the flow
    }

    // Clean up existing Supabase invitation records
    try {
      const { error: deleteError } = await supabaseAdmin
        .from("user_invitations")
        .delete()
        .eq("email", invitation.email.toLowerCase())
        .eq("organisation_id", invitation.organisationId)

      if (deleteError) {
        console.warn(`Warning: Failed to delete existing Supabase invitation for ${invitation.email}:`, deleteError)
        // Continue anyway - might not exist
      } else {
        console.log(`Cleaned up existing Supabase invitation records for ${invitation.email}`)
      }
    } catch (supabaseCleanupError) {
      console.warn(`Warning: Failed to cleanup Supabase invitations for ${invitation.email}:`, supabaseCleanupError)
      // Continue anyway - this is not critical for the flow
    }

    // Create Clerk invitation
    let clerkInvitation
    try {
      clerkInvitation = await clerk.invitations.createInvitation({
        emailAddress: invitation.email,
        publicMetadata: {
          organisation_id: invitation.organisationId,
          role: invitation.role
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/sign-up`
      })
    } catch (clerkError: any) {
      // Log detailed Clerk error information
      console.error(`Clerk invitation failed for ${invitation.email}:`, {
        status: clerkError.status,
        code: clerkError.code,
        message: clerkError.message,
        errors: clerkError.errors, // This will show the actual validation errors
        clerkTraceId: clerkError.clerkTraceId
      })

      // Create a more detailed error message
      let errorDetails = `Clerk API error (${clerkError.status})`
      if (clerkError.errors && Array.isArray(clerkError.errors)) {
        const errorMessages = clerkError.errors.map((err: any) => `${err.code}: ${err.message}`).join(', ')
        errorDetails = `${errorDetails}: ${errorMessages}`
      }

      throw new Error(`Failed to create Clerk invitation for ${invitation.email}: ${errorDetails}`)
    }

    // Validate Clerk invitation was created successfully
    if (!clerkInvitation || !clerkInvitation.id) {
      throw new Error(`Failed to create Clerk invitation for ${invitation.email}: No invitation ID returned`)
    }

    console.log(`Creating invitation for ${invitation.email} with status: pending`)
    console.log(`Clerk invitation ID: ${clerkInvitation.id}`)
    console.log(`Redirect URL: ${process.env.NEXT_PUBLIC_SITE_URL}/sign-up`)

    // Create invitation record
    const { data: invitationRecord, error } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        email: invitation.email.toLowerCase(),
        name: invitation.name ? toTitleCase(invitation.name) : null, // NEW
        organisation_id: invitation.organisationId,
        role_name: invitation.role,
        status: 'pending',
        clerk_invitation_id: clerkInvitation.id,
        courses: invitation.courseIds || [],
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (error) {
      // Try to revoke Clerk invitation if Supabase insert failed
      try {
        if (clerkInvitation && clerkInvitation.id) {
          await clerk.invitations.revokeInvitation(clerkInvitation.id)
        }
      } catch (revokeError) {
        // Log but don't throw - cleanup failures shouldn't block the main error
        console.warn(`Warning: Failed to revoke Clerk invitation during cleanup for ${invitation.email}:`, revokeError)
      }
      throw new Error(`Failed to create invitation: ${error.message}`)
    }

    // Verify status was set correctly
    if (invitationRecord && invitationRecord.status !== 'pending') {
      console.warn(`Warning: Invitation ${invitationRecord.id} has unexpected status: ${invitationRecord.status}`)
    }

    return invitationRecord

  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to invite user')
  }
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string): Promise<void> {
  const { user } = await requireUserWithOrg()
  const supabaseAdmin = createSupabaseAdmin()
  const clerk = await clerkClient()

  try {
    // Get invitation details
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("user_invitations")
      .select("*")
      .eq("id", invitationId)
      .single()

    if (fetchError || !invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status === 'accepted') {
      throw new Error('Cannot resend accepted invitation')
    }

    // Revoke existing Clerk invitation if it exists
    if (invitation.clerk_invitation_id) {
      try {
        await clerk.invitations.revokeInvitation(invitation.clerk_invitation_id)
      } catch (revokeError) {
        console.error('Failed to revoke existing invitation:', revokeError)
      }
    }

    // Create new Clerk invitation
    const clerkInvitation = await clerk.invitations.createInvitation({
      emailAddress: invitation.email,
      publicMetadata: {
        organisation_id: invitation.organisation_id,
        role: invitation.role_name
      },
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/sign-up`
    })

    // Update invitation record
    const { error: updateError } = await supabaseAdmin
      .from("user_invitations")
      .update({
        clerk_invitation_id: clerkInvitation.id,
        status: 'pending',
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq("id", invitationId)

    if (updateError) {
      throw new Error(`Failed to update invitation: ${updateError.message}`)
    }

  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to resend invitation')
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, newRole: 'org_admin' | 'org_member'): Promise<void> {
  // Validate input parameters
  const validatedInput = UpdateUserRoleSchema.parse({ userId, newRole })

  const { user } = await requireOrgAdmin() // Changed to require admin privileges
  const supabaseAdmin = createSupabaseAdmin()
  const clerk = await clerkClient()

  try {
    // Get current user data
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("clerk_id, organisation_id, user_roles(role:roles(name))")
      .eq("id", userId)
      .single()

    if (fetchError || !targetUser) {
      throw new Error('User not found')
    }

    // Get new role ID
    const { data: role, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", newRole)
      .single()

    if (roleError || !role) {
      throw new Error('Role not found')
    }

    // Update user role
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)

    if (deleteError) {
      throw new Error(`Failed to remove old roles: ${deleteError.message}`)
    }

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: role.id,
        organisation_id: targetUser.organisation_id
      })

    if (insertError) {
      throw new Error(`Failed to assign new role: ${insertError.message}`)
    }

    // Update Clerk metadata
    await clerk.users.updateUser(targetUser.clerk_id, {
      publicMetadata: {
        organisation_id: targetUser.organisation_id,
        role: newRole
      }
    })

    // NOTE: JWT Token Refresh Issue
    // After updating Clerk metadata, existing JWT tokens will remain stale until they naturally expire
    // or are manually refreshed. This can cause authorization issues if the user tries to access
    // role-protected resources immediately after a role change.
    //
    // SOLUTION: The target user should call POST /api/auth/refresh-session to force a token refresh,
    // or sign out and back in to get a fresh JWT with updated role claims.
    //
    // This is a known limitation of JWT-based authentication where server-side metadata changes
    // don't automatically invalidate client-side tokens.

  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to update user role')
  }
}

/**
 * Get invitations with filtering
 */
export async function getInvitations(filters: {
  status?: string
  organisationId?: string
  page?: number
  limit?: number
} = {}): Promise<{
  invitations: UserInvitation[]
  totalCount: number
  pagination: any
}> {
  const { user } = await requireUserWithOrg()
  const supabase = await createSupabaseClient()

  const { status, organisationId, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from("user_invitations")
    .select(`
      *,
      inviter:users!invited_by(name),
      organisation:organisations(name)
    `)

  if (status) {
    query = query.eq('status', status)
  }

  if (organisationId) {
    query = query.eq('organisation_id', organisationId)
  }

  const { data: invitations, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('invited_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`)
  }

  const transformedInvitations: UserInvitation[] = (invitations || []).map(invitation => ({
    ...invitation,
    inviterName: invitation.inviter?.name,
    organisationName: invitation.organisation?.name
  }))

  const totalPages = Math.ceil((count || 0) / limit)

  return {
    invitations: transformedInvitations,
    totalCount: count || 0,
    pagination: {
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserWithRole | null> {
  await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  const { data: user, error } = await supabase
    .from("users")
    .select(`
      *,
      user_roles(role:roles(name)),
      organisation:organisations(name)
    `)
    .eq("id", userId)
    .single()

  if (error || !user) {
    return null
  }

  return {
    ...user,
    role: user.user_roles?.[0]?.role?.name || 'org_member',
    organisationName: user.organisation?.name,
    courseEnrollments: []
  }
}

/**
 * Delete user (platform admin only)
 */
export async function deleteUser(
  userId: string,
  userEmail: string,
  confirmation: { email: string }
): Promise<{ success: boolean; message: string }> {
  // Require platform admin
  await requirePlatformAdmin()

  const supabaseAdmin = createSupabaseAdmin()
  const clerk = await clerkClient()

  // Verify email confirmation matches exactly
  if (confirmation.email !== userEmail) {
    throw new Error('Email confirmation does not match')
  }

  try {
    // Get user details
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Prevent deleting platform admins to avoid lockout
    if (user.role === 'platform_admin') {
      throw new Error('Cannot delete platform administrators')
    }

    // Try to delete from Clerk first, but handle case where user doesn't exist in Clerk
    try {
      await clerk.users.deleteUser(user.clerk_id)
      console.log(`Successfully deleted user from Clerk: ${user.clerk_id}`)
    } catch (clerkError: any) {
      // If user doesn't exist in Clerk, that's okay - continue with Supabase cleanup
      if (clerkError?.status === 404 || clerkError?.message?.includes('not_found') || clerkError?.message?.includes('Not Found')) {
        console.log(`User ${user.clerk_id} not found in Clerk, continuing with Supabase cleanup`)
      } else {
        // Re-throw other Clerk errors
        throw clerkError
      }
    }

    // Manual cleanup - delete user from Supabase directly since webhook might not trigger
    // Delete invitations created by this user first
    await supabaseAdmin
      .from("user_invitations")
      .delete()
      .eq("invited_by", userId)

    // Delete user roles (should cascade automatically but being explicit)
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)

    // Delete course enrollments (should cascade automatically but being explicit)
    await supabaseAdmin
      .from("course_user_enrollments")
      .delete()
      .eq("user_id", userId)

    // Finally delete the user record
    const { error: userDeleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId)

    if (userDeleteError) {
      throw new Error(`Failed to delete user from database: ${userDeleteError.message}`)
    }

    return {
      success: true,
      message: `User ${userEmail} deleted successfully`
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Delete user error:', error)
    throw new Error(`Failed to delete user: ${errorMessage}`)
  }
}