import { createSupabaseClient } from "@/lib/supabase"

export default async function DebugEnrollmentsPage() {
  const supabase = await createSupabaseClient()

  // Get all organizations
  const { data: orgs } = await supabase
    .from("organisations")
    .select("*")

  // Get all course enrollments with org and course names
  const { data: enrollments } = await supabase
    .from("course_org_enrollments")
    .select(`
      *,
      organisations (name),
      courses (name, slug, is_published)
    `)

  // Get all users with their org assignments
  const { data: users } = await supabase
    .from("users")
    .select(`
      *,
      organisations (name)
    `)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Enrollments</h1>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Organizations</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(orgs, null, 2)}
          </pre>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Course Enrollments</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(enrollments, null, 2)}
          </pre>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Users & Organizations</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}