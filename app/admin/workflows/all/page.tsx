import { searchWorkflows } from "@/lib/actions/workflow.actions"
import { WorkflowActionsDropdown } from "@/components/admin/WorkflowActionsDropdown"
import { WorkflowPagination } from "@/components/ui/workflow-pagination"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface AllWorkflowsPageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    category?: string
    department?: string
  }>
}

export default async function AllWorkflowsPage({ searchParams }: AllWorkflowsPageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page) : 1

  const searchResults = await searchWorkflows({
    query: params.q,
    categoryId: params.category,
    departmentId: params.department,
    page,
    limit: 25 // Show 25 workflows per page in admin view
  })

  const hasQuery = !!params.q
  const hasFilters = !!params.category || !!params.department

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/workflows">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Workflows</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all workflows in the system
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search workflows..."
                className="pl-10"
                defaultValue={params.q || ""}
                name="q"
              />
            </div>

            {/* Active Filters */}
            {(hasQuery || hasFilters) && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {hasQuery && (
                  <Badge variant="secondary">
                    Search: "{params.q}"
                  </Badge>
                )}
                {hasFilters && (
                  <Badge variant="secondary">
                    Filtered
                  </Badge>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/workflows/all">
                    Clear all
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {hasQuery || hasFilters ? "Search Results" : "All Workflows"}
            </h3>
            <div className="text-sm text-gray-500">
              {searchResults.totalCount} total workflows
            </div>
          </div>

          {searchResults.workflows.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasQuery || hasFilters
                  ? "Try adjusting your search terms or filters."
                  : "No workflows have been created yet."
                }
              </p>
              {(hasQuery || hasFilters) && (
                <Button className="mt-4" variant="outline" asChild>
                  <Link href="/admin/workflows/all">View All Workflows</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workflows Table */}
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
                  {searchResults.workflows.map((workflow) => (
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
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <WorkflowPagination
                currentPage={searchResults.pagination.page}
                totalPages={searchResults.pagination.totalPages}
                hasNextPage={searchResults.pagination.hasNextPage}
                hasPreviousPage={searchResults.pagination.hasPreviousPage}
                totalCount={searchResults.totalCount}
                itemsPerPage={searchResults.pagination.limit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}