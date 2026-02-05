import { requirePlatformAdmin } from "@/lib/auth/user"
import { getUsersForAdmin } from "@/lib/actions/user-management.actions"
import { UserManagementClient } from "@/components/admin/UserManagementClient"

export default async function UserManagementPage() {
  // Server-side authentication - only platform admins can access this page
  const user = await requirePlatformAdmin()

  // Server-side data fetching
  const initialData = await getUsersForAdmin({
    query: '',
    page: 1,
    limit: 20
  })

  return (
    <UserManagementClient
      user={user}
      initialData={initialData}
    />
  )
}