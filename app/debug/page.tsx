import { getCurrentUser } from "@/lib/auth/user"

export default async function DebugPage() {
  const user = await getCurrentUser()

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