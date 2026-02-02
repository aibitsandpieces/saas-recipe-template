import { requireUserWithOrg } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, organisationId } = await requireUserWithOrg()

    const supabase = await createSupabaseClient()

    // Get file info with course details
    const { data: file, error } = await supabase
      .from("course_lesson_files")
      .select(`
        *,
        course_lessons (
          course_modules (
            course_id,
            courses (
              id,
              name
            )
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error || !file) {
      console.error("File not found:", error)
      return new NextResponse("File not found", { status: 404 })
    }

    // Get the course ID
    const courseId = file.course_lessons.course_modules.course_id

    // Platform admins have access to all files
    const isPlatformAdmin = user.roles.includes("platform_admin")

    if (!isPlatformAdmin) {
      // For non-platform admins, check enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("course_org_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("organisation_id", organisationId)
        .maybeSingle()

      if (enrollmentError) {
        console.error("Error checking enrollment:", enrollmentError)
        return new NextResponse("Access verification failed", { status: 500 })
      }

      if (!enrollment) {
        return new NextResponse("Access denied - organization not enrolled in this course", { status: 403 })
      }
    }

    // Get file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("courses")
      .download(file.storage_path)

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError)
      return new NextResponse("File download failed", { status: 500 })
    }

    // Return file with appropriate headers
    const blob = fileData as Blob
    const headers = new Headers({
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.file_name}"`,
      "Content-Length": blob.size.toString(),
    })

    return new NextResponse(blob, { headers })

  } catch (error) {
    console.error("File download error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}