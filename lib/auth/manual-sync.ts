import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "../supabase-admin";

/**
 * Manual user sync utility for development debugging
 * Call this when user exists in Clerk but not in Supabase
 */
export async function manualUserSync() {
  const { userId } = await auth();
  if (!userId) throw new Error("No authenticated user");

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  const supabase = createSupabaseAdmin();

  console.log('Manual sync for user:', {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName
  });

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existingUser) {
    console.log('User already exists in database:', existingUser);
    return existingUser;
  }

  // Create user using the same RPC if available, or fallback to direct insert
  try {
    const { data, error } = await supabase.rpc('create_user_complete', {
      p_clerk_id: clerkUser.id,
      p_email: clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase(),
      p_first_name: clerkUser.firstName,
      p_last_name: clerkUser.lastName
    });

    if (error) throw error;

    console.log('Manual sync completed using RPC:', data);
    return data;
  } catch (rpcError) {
    console.warn('RPC not available, using fallback approach:', rpcError);

    // Fallback to direct insert
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

    const { data, error } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        email: email,
        name: name,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        organisation_id: null // No org assignment in manual sync
      })
      .select("id")
      .single();

    if (error) throw error;

    console.log('Manual sync completed with fallback:', data);
    return data;
  }
}

/**
 * Check sync status for current user
 */
export async function checkSyncStatus() {
  const { userId } = await auth();
  if (!userId) {
    return { status: 'no_auth', message: 'No authenticated user' };
  }

  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    const supabase = createSupabaseAdmin();
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("id, email, name, first_name, last_name, organisation_id")
      .eq("clerk_id", userId)
      .single();

    return {
      status: error ? 'not_synced' : 'synced',
      clerk: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        metadata: clerkUser.publicMetadata
      },
      database: dbUser || null,
      error: error || null
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    };
  }
}