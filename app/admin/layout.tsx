import { getCurrentUser } from "@/lib/auth/user"
import { logAuthState } from "@/lib/auth/auth-monitor"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Allow both platform_admin and org_admin to access admin area
  const user = await getCurrentUser()

  if (!user || (!user.roles.includes("platform_admin") && !user.roles.includes("org_admin"))) {
    redirect("/dashboard")
  }

  await logAuthState('AdminLayout', user)

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  )
}