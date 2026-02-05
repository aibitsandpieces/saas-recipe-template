import { requirePlatformAdmin } from "@/lib/auth/user"
import { logAuthState } from "@/lib/auth/auth-monitor"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only platform admins can access admin area
  const user = await requirePlatformAdmin()
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