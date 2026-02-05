import { getCurrentUser } from "@/lib/auth/user"
import { redirect } from "next/navigation"

export default async function DebugPage() {
  const user = await getCurrentUser()

  // Debug pages should be admin-only in production
  if (process.env.NODE_ENV === 'production' &&
      (!user || !user.roles.includes("platform_admin"))) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug User Info</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  )
}