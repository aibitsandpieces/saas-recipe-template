import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth/user";
import { checkSyncStatus, manualUserSync } from "@/lib/auth/manual-sync";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuthTestPage() {
  const { userId } = await auth();
  const user = await getCurrentUser();

  // Debug pages should be admin-only in production
  if (process.env.NODE_ENV === 'production' &&
      (!user || !user.roles.includes("platform_admin"))) {
    redirect("/dashboard")
  }

  const syncStatus = await checkSyncStatus();

  async function handleManualSync() {
    'use server';
    try {
      const result = await manualUserSync();
      console.log('Manual sync result:', result);
      // Redirect to refresh page
      // redirect('/debug/auth-test');
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Auth Debug Information</h1>

      {/* Clerk Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle>Clerk Authentication</CardTitle>
          <CardDescription>Authentication status from Clerk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Clerk User ID:</strong> {userId || 'None'}</div>
          <div><strong>Status:</strong> {userId ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
        </CardContent>
      </Card>

      {/* Database User Status */}
      <Card>
        <CardHeader>
          <CardTitle>Database User</CardTitle>
          <CardDescription>User data from Supabase database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Database User:</strong> {user ? '✅ Found' : '❌ Not Found'}</div>
          {user ? (
            <div className="space-y-1">
              <div><strong>Database ID:</strong> {user.id}</div>
              <div><strong>Email:</strong> {user.email || 'N/A'}</div>
              <div><strong>Name:</strong> {user.name || 'N/A'}</div>
              <div><strong>First Name:</strong> {user.firstName || 'N/A'}</div>
              <div><strong>Last Name:</strong> {user.lastName || 'N/A'}</div>
              <div><strong>Organisation ID:</strong> {user.organisationId || 'N/A'}</div>
              <div><strong>Roles:</strong> {user.roles.join(', ') || 'None'}</div>
            </div>
          ) : (
            <div className="text-red-600">
              <strong>Error:</strong> User exists in Clerk but not in database (sync issue)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Detailed sync status between Clerk and Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><strong>Status:</strong> {syncStatus.status}</div>

          {syncStatus.clerk && (
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-semibold text-blue-800">Clerk Data:</h4>
              <div className="text-sm space-y-1 mt-2">
                <div><strong>ID:</strong> {syncStatus.clerk.id}</div>
                <div><strong>Email:</strong> {syncStatus.clerk.email}</div>
                <div><strong>First Name:</strong> {syncStatus.clerk.firstName || 'N/A'}</div>
                <div><strong>Last Name:</strong> {syncStatus.clerk.lastName || 'N/A'}</div>
                <div><strong>Metadata:</strong> {JSON.stringify(syncStatus.clerk.metadata, null, 2)}</div>
              </div>
            </div>
          )}

          {syncStatus.database ? (
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-semibold text-green-800">Database Data:</h4>
              <pre className="text-sm mt-2 whitespace-pre-wrap">
                {JSON.stringify(syncStatus.database, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-red-50 p-3 rounded">
              <h4 className="font-semibold text-red-800">Database Error:</h4>
              <div className="text-sm mt-2">
                {syncStatus.error ? JSON.stringify(syncStatus.error, null, 2) : 'User not found'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {syncStatus.status === 'not_synced' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Tools to fix sync issues</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleManualSync}>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Manually Sync User
              </Button>
            </form>
            <p className="text-sm text-gray-600 mt-2">
              This will create the user record in the database based on Clerk data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>User not in database:</strong> This indicates a webhook delivery failure. Use manual sync or check webhook configuration.</div>
          <div><strong>Missing name fields:</strong> Clerk Dashboard may not be configured to collect first_name/last_name during sign-up.</div>
          <div><strong>Role issues:</strong> Check RLS policies and ensure migrations are applied.</div>
          <div><strong>Local development:</strong> Webhook delivery to localhost often fails. Use manual sync for testing.</div>
        </CardContent>
      </Card>

      {/* Raw Data Debug */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Debug Data</CardTitle>
          <CardDescription>Complete sync status object for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
            {JSON.stringify({ userId, user, syncStatus }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}