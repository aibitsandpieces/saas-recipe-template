import { requirePlatformAdmin } from "@/lib/auth/user"
import { UserRoleProvider } from "@/lib/hooks/useUserRole"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure only platform admins can access admin area and get user context
  const user = await requirePlatformAdmin()

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