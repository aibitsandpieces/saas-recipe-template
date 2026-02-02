import { getWorkflowCategories, getWorkflowDepartmentsByCategory } from "@/lib/actions/workflow.actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewWorkflowPage() {
  const categories = await getWorkflowCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/workflows">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Workflow</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new workflow to the library
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-500 mb-6">
            Individual workflow creation form will be available in the next update.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              For now, you can bulk import workflows using CSV files.
            </p>
            <Button asChild>
              <Link href="/admin/workflows/import">
                Import CSV
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}