import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) and should only be used
 * in server-side operations like webhooks and admin functions.
 *
 * IMPORTANT: Never use this client in client-side code or expose
 * the service role key to the browser.
 */
export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};