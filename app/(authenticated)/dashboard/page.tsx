import { getCurrentUser } from "@/lib/auth/user"
import { isPlatformAdmin, isAdmin } from "@/lib/auth/role-utils"
import { logAuthState } from "@/lib/auth/auth-monitor"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  await logAuthState('Dashboard', user)

  const userIsPlatformAdmin = isPlatformAdmin(user)
  const userIsAdmin = isAdmin(user)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome back, {user?.name}</h1>

      {/* Quick Link Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Courses Card */}
        <Link href="/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Courses</CardTitle>
              <CardDescription>Access your training materials</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Workflows Card */}
        <Link href="/workflows">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
              <CardDescription>Browse AI workflow library</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Book Workflows Card */}
        <Link href="/book-workflows">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Book Workflows</CardTitle>
              <CardDescription>Explore book-based workflows</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Admin Card (for admins only) */}
        {userIsAdmin && (
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Admin</CardTitle>
                <CardDescription>Manage users and settings</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>

      {/* Platform Admin Stats (platform_admin only) */}
      {userIsPlatformAdmin && (
        <div className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Simple stat cards - implement with actual counts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                <div className="text-2xl font-bold">--</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
                <div className="text-2xl font-bold">--</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
                <div className="text-2xl font-bold">--</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Workflows</CardTitle>
                <div className="text-2xl font-bold">--</div>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}