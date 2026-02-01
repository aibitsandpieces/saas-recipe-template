import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { clerkClient } from "@clerk/nextjs/server";

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
 * Creates corresponding user record in Supabase and assigns default role
 */
async function handleUserCreated(clerkUser: any, supabase: any) {
  console.log("Creating user:", clerkUser.id);

  const orgId = clerkUser.public_metadata?.organisation_id;
  const email = clerkUser.email_addresses[0]?.email_address;
  const name = `${clerkUser.first_name || ""} ${clerkUser.last_name || ""}`.trim() || null;

  try {
    // Create user record in Supabase
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        email: email,
        name: name,
        organisation_id: orgId || null
      })
      .select("id")
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }

    // Assign default org_member role if they have an organisation
    if (orgId && user) {
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "org_member")
        .single();

      if (roleError) {
        console.error("Error finding org_member role:", roleError);
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

        // Update Clerk metadata with role information
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: {
            organisation_id: orgId,
            role: "org_member"
          }
        });
      }
    }

    console.log("Successfully created user and assigned role");
  } catch (error) {
    console.error("Error in handleUserCreated:", error);
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
  const name = `${clerkUser.first_name || ""} ${clerkUser.last_name || ""}`.trim() || null;

  try {
    // Update user record in Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email: email,
        name: name,
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
      await clerkClient.users.updateUser(clerkUser.id, {
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