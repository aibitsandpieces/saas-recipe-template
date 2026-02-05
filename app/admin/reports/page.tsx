import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireOrgAdmin } from "@/lib/auth/user"

export default async function AdminReportsPage() {
  // Both platform admins and org admins can access reports
  await requireOrgAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Analytics and reporting dashboard</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Completion reports are coming soon.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}