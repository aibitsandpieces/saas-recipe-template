import { Suspense } from "react"
import { Book, FileText, FolderOpen, Target, Upload, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getBookWorkflowStatistics } from "@/lib/actions/book-workflow.actions"
import { requirePlatformAdmin } from "@/lib/auth/user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DeleteAllBookWorkflowDataButton } from "@/components/book-workflows/DeleteAllBookWorkflowDataButton"

async function BookWorkflowAdminContent() {
  // Only platform admins can access book workflows
  await requirePlatformAdmin()

  const stats = await getBookWorkflowStatistics()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Book Workflows Management</h1>
        <p className="text-gray-600 mt-2">
          Manage the book workflows system including CSV import and data management.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
            <p className="text-xs text-muted-foreground">
              Fixed departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
            <p className="text-xs text-muted-foreground">
              Workflow categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.books}</div>
            <p className="text-xs text-muted-foreground">
              Source books
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workflows}</div>
            <p className="text-xs text-muted-foreground">
              Total workflows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Workflows
            </CardTitle>
            <CardDescription>
              Import book workflows from a CSV file. The CSV should contain department, category, book, author, workflow, activity_type, and problem_goal columns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/book-workflows/import">
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV File
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Manage existing book workflow data. Use with caution as these actions cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAllBookWorkflowDataButton />
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>
            Navigate to related sections and management pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/book-workflows">
              <Button variant="outline" className="w-full justify-start">
                <Book className="h-4 w-4 mr-2" />
                View Book Workflows (Public)
              </Button>
            </Link>
            <Link href="/admin/workflows">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Manage Regular Workflows
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            About Book Workflows
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 space-y-2">
          <p>
            The Book Workflows system is completely separate from the regular workflow system.
            It provides:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Hierarchical browsing: Department → Category → Book → Workflow</li>
            <li>Global access pattern (all authenticated users can view)</li>
            <li>Fixed department structure with dynamic categories and books</li>
            <li>Activity type and problem/goal filtering</li>
            <li>Full-text search capabilities</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookWorkflowAdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      }>
        <BookWorkflowAdminContent />
      </Suspense>
    </div>
  )
}