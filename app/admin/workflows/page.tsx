import { getWorkflowCategoriesWithDepartments, searchWorkflows } from "@/lib/actions/workflow.actions"
import { getImportLogs } from "@/lib/actions/csv-import.actions"
import { WorkflowActionsDropdown } from "@/components/admin/WorkflowActionsDropdown"
import { WorkflowBulkActions } from "@/components/admin/WorkflowBulkActions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Upload,
  FolderTree,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"
import Link from "next/link"

export default async function WorkflowsAdminPage() {
  // Fetch all data needed for the dashboard
  const [categoriesWithDepartments, allWorkflows, recentImportLogs] = await Promise.all([
    getWorkflowCategoriesWithDepartments(),
    searchWorkflows({ limit: 20, page: 1 }), // Show first 20 workflows for overview
    getImportLogs()
  ])

  const totalCategories = categoriesWithDepartments.length
  const totalDepartments = categoriesWithDepartments.reduce((sum, cat) => sum + cat.departments.length, 0)
  const totalWorkflows = allWorkflows.totalCount
  const publishedWorkflows = allWorkflows.workflows.filter(w => w.is_published).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage workflow categories, departments, and content
          </p>
        </div>
        <div className="flex space-x-2">
          <WorkflowBulkActions
            totalWorkflows={totalWorkflows}
          />
          <Button asChild variant="outline">
            <Link href="/admin/workflows/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/workflows/new">
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Top-level organization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDepartments}</div>
            <p className="text-xs text-muted-foreground">
              Second-level organization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              All workflow content
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              Publicly visible
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="workflows">All Workflows</TabsTrigger>
          <TabsTrigger value="imports">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Hierarchy</h3>
              {categoriesWithDepartments.length === 0 ? (
                <div className="text-center py-8">
                  <FolderTree className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No categories yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by importing workflows or creating categories manually.
                  </p>
                  <div className="mt-6 flex justify-center space-x-3">
                    <Button asChild variant="outline">
                      <Link href="/admin/workflows/import">Import CSV</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/admin/workflows/categories/new">New Category</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {categoriesWithDepartments.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-md font-medium text-gray-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {category.departments.length} departments
                          </Badge>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/workflows/categories/${category.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {category.departments.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No departments yet</div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {category.departments.map((department) => (
                            <div key={department.id} className="border-l-2 border-blue-200 pl-4 py-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{department.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {department.workflowCount || 0} workflows
                                  </div>
                                </div>
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/admin/workflows/departments/${department.id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="bg-white shadow rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allWorkflows.workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No workflows found. Import workflows or create them manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  allWorkflows.workflows.slice(0, 20).map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {workflow.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{workflow.categoryName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{workflow.departmentName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={workflow.is_published ? "default" : "secondary"}
                        >
                          {workflow.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {workflow.source_author && (
                            <div>{workflow.source_author}</div>
                          )}
                          {workflow.source_book && (
                            <div className="text-gray-500">{workflow.source_book}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {workflow.fileCount || 0} files
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <WorkflowActionsDropdown
                          workflowId={workflow.id!}
                          workflowName={workflow.name}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {allWorkflows.pagination.hasNextPage && (
              <div className="p-4 text-center">
                <Button asChild variant="outline">
                  <Link href="/admin/workflows/all">
                    View All Workflows ({allWorkflows.totalCount} total)
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="imports" className="space-y-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Import History</h3>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/workflows/import">
                    <Upload className="mr-2 h-4 w-4" />
                    New Import
                  </Link>
                </Button>
              </div>

              {recentImportLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No imports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by importing your first CSV file of workflows.
                  </p>
                  <div className="mt-6">
                    <Button asChild>
                      <Link href="/admin/workflows/import">Import CSV</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Imported By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentImportLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{log.file_name}</div>
                        </TableCell>
                        <TableCell>
                          {log.status === "completed" ? (
                            log.failed_rows > 0 ? (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Partial Failure
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Success
                              </Badge>
                            )
                          ) : log.status === "failed" ? (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {log.successful_rows}/{log.total_rows} rows
                            </div>
                            <div className="text-gray-500">
                              {log.workflows_created} workflows, {log.categories_created} categories
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.importerName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.started_at ? new Date(log.started_at).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/workflows/imports/${log.id}`}>
                              Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}