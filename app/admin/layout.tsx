import { requirePlatformAdmin, requireOrgAdmin, getCurrentUser } from "@/lib/auth/user"
import { UserRoleProvider } from "@/lib/hooks/useUserRole"
import AdminBreadcrumbs from "@/components/AdminBreadcrumbs"

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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <UserRoleProvider roles={user.roles}>
          <AdminBreadcrumbs />
          {children}
        </UserRoleProvider>
      </main>
    </div>
  )
}