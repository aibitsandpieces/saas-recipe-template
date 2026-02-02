import { NextRequest, NextResponse } from "next/server"
import { requireUserWithOrg } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const { user, organisationId } = await requireUserWithOrg()
    const supabase = await createSupabaseClient()

    // Test enrollment check for the specific course
    const courseId = "ef5e14a6-9310-43f9-b5ef-211e8afc5ce0"

    const { data: enrollment, error } = await supabase
      .from("course_org_enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("organisation_id", organisationId)
      .maybeSingle()

    const { data: allEnrollments } = await supabase
      .from("course_org_enrollments")
      .select("*")
      .eq("course_id", courseId)

    return NextResponse.json({
      success: true,
      userOrgId: organisationId,
      courseId,
      enrollment,
      allEnrollments,
      isEnrolled: !!enrollment
    })

  } catch (error) {
    console.error("Debug enrollment error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}