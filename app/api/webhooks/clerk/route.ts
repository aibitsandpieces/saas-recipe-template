import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { clerkClient } from "@clerk/nextjs/server";
import { toTitleCase } from "@/lib/utils";

/**
 * Webhook endpoint for handling Clerk user lifecycle events.
 * This endpoint synchronizes user data between Clerk and Supabase,
 * including role assignment and metadata management.
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers for webhook verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing required svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // Create admin Supabase client
  const supabase = createSupabaseAdmin();

  try {
    switch (evt.type) {
      case "user.created":
        await handleUserCreated(evt.data, supabase);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data, supabase);
        break;
      case "user.deleted":
        await handleUserDeleted(evt.data, supabase);
        break;
      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook Error]:", error);
    // Return 200 to prevent Clerk from retrying
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

/**
 * Handle user creation in Clerk
 * Creates corresponding user record in Supabase, checks for pending invitations,
 * and assigns appropriate role and individual course enrollments
 */
async function handleUserCreated(clerkUser: any, supabase: any) {
  console.log('Processing user.created webhook:', {
    userId: clerkUser.id,
    email: clerkUser.email_addresses?.[0]?.email_address,
    firstName: clerkUser.first_name,
    lastName: clerkUser.last_name
  });

  // Enhanced validation
  if (!clerkUser.first_name || !clerkUser.last_name) {
    console.warn('User created without required name fields:', {
      userId: clerkUser.id,
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name
    });
  }

  const email = clerkUser.email_addresses[0]?.email_address?.toLowerCase();

  // Extract and format names from Clerk
  const rawFirstName = clerkUser.first_name?.trim() || "";
  const rawLastName = clerkUser.last_name?.trim() || "";

  const first_name = rawFirstName ? toTitleCase(rawFirstName) : null;
  const last_name = rawLastName ? toTitleCase(rawLastName) : null;

  // Maintain backward compatibility with single name field
  const name = [first_name, last_name].filter(Boolean).join(' ') || null;

  if (!email) {
    throw new Error("No email address found for user");
  }

  try {
    // Check for pending invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (invitationError && invitationError.code !== 'PGRST116') {
      console.error("Error checking for invitation:", invitationError);
      throw invitationError;
    }

    // Fallback logic: if Clerk has no first_name, use invitation name
    let finalFirstName = first_name;
    let finalLastName = last_name;
    let finalName = name;

    if (!first_name && invitation?.name) {
      finalFirstName = toTitleCase(invitation.name);
      finalLastName = null; // Don't guess where to split
      finalName = finalFirstName;
    }

    let orgId = clerkUser.public_metadata?.organisation_id;
    let userRole = "org_member";

    // If invitation exists, use invitation details
    if (invitation) {
      orgId = invitation.organisation_id;
      userRole = invitation.role_name;
      console.log(`Found pending invitation for ${email}, org: ${orgId}, role: ${userRole}`);
    }

    // Execute user creation with transaction boundaries
    let user: any;
    try {
      // Use Supabase RPC for atomic transaction
      const { data, error } = await supabase.rpc('create_user_with_role_and_enrollments', {
        p_clerk_id: clerkUser.id,
        p_email: email,
        p_name: finalName,
        p_organisation_id: orgId,
        p_role_name: userRole,
        p_first_name: finalFirstName,
        p_last_name: finalLastName,
        p_invitation_id: invitation?.id || null,
        p_course_ids: invitation?.courses || []
      });

      if (error) {
        console.error("Error in user creation transaction:", error);
        throw error;
      }

      user = data;
      console.log("User created successfully with transaction:", user);
    } catch (transactionError) {
      // If RPC doesn't exist yet, fall back to individual operations with error handling
      console.warn("RPC not available, using fallback approach:", transactionError);

      // Create user record in Supabase
      const { data: createdUser, error: userError } = await supabase
        .from("users")
        .insert({
          clerk_id: clerkUser.id,
          email: email,
          name: finalName,
          first_name: finalFirstName,
          last_name: finalLastName,
          organisation_id: orgId || null
        })
        .select("id")
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        throw userError;
      }

      user = createdUser;

      // Assign role if they have an organisation
      if (orgId && user) {
        try {
          const { data: role, error: roleError } = await supabase
            .from("roles")
            .select("id")
            .eq("name", userRole)
            .single();

          if (roleError) {
            console.error(`Error finding ${userRole} role:`, roleError);
            throw roleError;
          }

          if (role) {
            const { error: userRoleError } = await supabase
              .from("user_roles")
              .insert({
                user_id: user.id,
                role_id: role.id,
                organisation_id: orgId
              });

            if (userRoleError) {
              console.error("Error assigning role:", userRoleError);
              throw userRoleError;
            }

            // Process individual course enrollments from invitation
            if (invitation && invitation.courses && invitation.courses.length > 0) {
              const enrollments = invitation.courses.map((courseId: string) => ({
                user_id: user.id,
                course_id: courseId,
                enrolled_by: invitation.invited_by
              }));

              const { error: enrollmentError } = await supabase
                .from("course_user_enrollments")
                .insert(enrollments);

              if (enrollmentError) {
                console.error("Error creating course enrollments:", enrollmentError);
                // Don't throw here for non-critical enrollment failures
              } else {
                console.log(`Created ${enrollments.length} course enrollments for user`);
              }
            }

            // Update invitation status to accepted
            if (invitation) {
              const { error: updateInvitationError } = await supabase
                .from("user_invitations")
                .update({
                  status: "accepted",
                  accepted_at: new Date().toISOString()
                })
                .eq("id", invitation.id);

              if (updateInvitationError) {
                console.error("Error updating invitation status:", updateInvitationError);
                // Don't throw here for non-critical invitation status update
              }
            }
          }
        } catch (roleAssignmentError) {
          // If role assignment fails, we should clean up the created user to prevent inconsistent state
          console.error("Role assignment failed, cleaning up user:", roleAssignmentError);

          await supabase
            .from("users")
            .delete()
            .eq("id", user.id);

          throw roleAssignmentError;
        }
      }
    }

    // Update Clerk metadata with role information
    if (orgId && user) {
      const clerk = await clerkClient();
      await clerk.users.updateUser(clerkUser.id, {
        publicMetadata: {
          organisation_id: orgId,
          role: userRole
        }
      });
    }

    console.log(`Successfully created user ${email} with role ${userRole}`);
  } catch (error) {
    console.error('Failed to process user.created webhook:', {
      error,
      userId: clerkUser.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Handle user updates in Clerk
 * Synchronizes updated user information with Supabase
 */
async function handleUserUpdated(clerkUser: any, supabase: any) {
  console.log("Updating user:", clerkUser.id);

  const email = clerkUser.email_addresses[0]?.email_address;

  // Extract and format names from Clerk
  const rawFirstName = clerkUser.first_name?.trim() || "";
  const rawLastName = clerkUser.last_name?.trim() || "";

  const first_name = rawFirstName ? toTitleCase(rawFirstName) : null;
  const last_name = rawLastName ? toTitleCase(rawLastName) : null;
  const name = [first_name, last_name].filter(Boolean).join(' ') || null;

  try {
    // Update user record in Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email: email,
        name: name,
        first_name: first_name,
        last_name: last_name,
        updated_at: new Date().toISOString()
      })
      .eq("clerk_id", clerkUser.id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      throw updateError;
    }

    // Sync Clerk metadata with current database state
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select(`
        organisation_id,
        user_roles(role:roles(name))
      `)
      .eq("clerk_id", clerkUser.id)
      .single();

    if (fetchError) {
      console.error("Error fetching user data:", fetchError);
      throw fetchError;
    }

    if (userData) {
      // Get the highest priority role (platform_admin > org_admin > org_member)
      const roles = userData.user_roles?.map((ur: any) => ur.role?.name) || [];
      let primaryRole = "org_member"; // default

      if (roles.includes("platform_admin")) {
        primaryRole = "platform_admin";
      } else if (roles.includes("org_admin")) {
        primaryRole = "org_admin";
      }

      // Update Clerk metadata
      const clerk = await clerkClient();
      await clerk.users.updateUser(clerkUser.id, {
        publicMetadata: {
          organisation_id: userData.organisation_id,
          role: primaryRole
        }
      });
    }

    console.log("Successfully updated user");
  } catch (error) {
    console.error("Error in handleUserUpdated:", error);
    throw error;
  }
}

/**
 * Handle user deletion in Clerk
 * Removes corresponding user record from Supabase
 */
async function handleUserDeleted(clerkUser: any, supabase: any) {
  console.log("Deleting user:", clerkUser.id);

  try {
    // Delete user record (CASCADE will handle user_roles)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("clerk_id", clerkUser.id);

    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }

    console.log("Successfully deleted user");
  } catch (error) {
    console.error("Error in handleUserDeleted:", error);
    throw error;
  }
}