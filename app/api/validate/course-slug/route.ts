import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/user";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Require platform admin authentication
    await requirePlatformAdmin();

    const body = await request.json();
    const { slug, excludeId } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if slug already exists (excluding the specified ID for edit scenarios)
    let query = supabase
      .from("courses")
      .select("id")
      .eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error validating course slug:", error);
      return NextResponse.json(
        { error: "Failed to validate slug" },
        { status: 500 }
      );
    }

    // Slug is available if no courses found
    const available = !data || data.length === 0;

    return NextResponse.json({ available });
  } catch (error: any) {
    console.error("Course slug validation error:", error);

    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate slug" },
      { status: 500 }
    );
  }
}