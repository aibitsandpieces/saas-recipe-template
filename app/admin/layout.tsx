import { requirePlatformAdmin, requireOrgAdmin, getCurrentUser } from "@/lib/auth/user"
import { UserRoleProvider } from "@/lib/hooks/useUserRole"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Allow both platform admins and org admins to access admin area
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Unauthorized: Authentication required")
  }

  // Check if user has admin privileges (platform_admin or org_admin)
  const hasAdminAccess = user.roles.includes("platform_admin") || user.roles.includes("org_admin")

  if (!hasAdminAccess) {
    throw new Error("Forbidden: Admin privileges required")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <nav className="ml-8 flex space-x-8">
              <a
                href="/admin/courses"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Courses
              </a>
              <a
                href="/admin/workflows"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Workflows
              </a>
              <a
                href="/admin/users"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Users
              </a>
            </nav>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <UserRoleProvider roles={user.roles}>
          {children}
        </UserRoleProvider>
      </main>
    </div>
  )
}