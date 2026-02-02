import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/user";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Require platform admin authentication
    await requirePlatformAdmin();

    const body = await request.json();
    const { name, courseId, excludeId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Module name is required" },
        { status: 400 }
      );
    }

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if name already exists within the course (excluding the specified ID for edit scenarios)
    let query = supabase
      .from("course_modules")
      .select("id")
      .eq("name", name)
      .eq("course_id", courseId);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error validating module name:", error);
      return NextResponse.json(
        { error: "Failed to validate module name" },
        { status: 500 }
      );
    }

    // Name is available if no modules found in this course
    const available = !data || data.length === 0;

    return NextResponse.json({ available });
  } catch (error: any) {
    console.error("Module name validation error:", error);

    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate module name" },
      { status: 500 }
    );
  }
}