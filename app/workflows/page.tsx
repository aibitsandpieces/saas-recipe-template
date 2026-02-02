import { getWorkflowCategoriesWithDepartments, searchWorkflows } from "@/lib/actions/workflow.actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  FolderTree,
  Building2,
  FileText,
  ExternalLink,
  Search,
  BookOpen,
  User
} from "lucide-react"
import Link from "next/link"

interface WorkflowsPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    department?: string
  }>
}

export default async function WorkflowsPage({ searchParams }: WorkflowsPageProps) {
  // Await searchParams for Next.js 15+ compatibility
  const params = await searchParams
  // Get all categories with departments for navigation
  const categoriesWithDepartments = await getWorkflowCategoriesWithDepartments()

  // Get search results if there's a query, otherwise show all published workflows
  const searchResults = await searchWorkflows({
    query: params.q,
    categoryId: params.category,
    departmentId: params.department,
    isPublished: true // Only show published workflows to public
  })

  const totalWorkflows = searchResults.totalCount
  const hasQuery = !!params.q
  const hasFilters = !!params.category || !!params.department

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Workflow Library
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Discover and explore our comprehensive collection of business workflows,
            organized by category and department for easy navigation.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <form action="/workflows" method="GET">
              <Input
                type="search"
                name="q"
                placeholder="Search workflows by name, topic, or author..."
                defaultValue={params.q}
                className="pl-10 pr-4 py-3 text-lg"
              />
              {params.category && (
                <input type="hidden" name="category" value={params.category} />
              )}
              {params.department && (
                <input type="hidden" name="department" value={params.department} />
              )}
            </form>
          </div>
        </div>

        {/* Results Summary */}
        {(hasQuery || hasFilters) && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  {totalWorkflows === 0
                    ? "No workflows found"
                    : `${totalWorkflows} workflow${totalWorkflows === 1 ? "" : "s"} found`
                  }
                  {hasQuery && ` for "${params.q}"`}
                </p>
                {(params.category || params.department) && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-sm text-gray-500">Filtered by:</span>
                    {params.category && (
                      <Badge variant="secondary">
                        Category: {categoriesWithDepartments.find(c => c.id === params.category)?.name}
                      </Badge>
                    )}
                    {params.department && (
                      <Badge variant="secondary">
                        Department: {searchResults.departments.find(d => d.id === params.department)?.name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button variant="outline" asChild>
                <Link href="/workflows">Clear Filters</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderTree className="h-5 w-5 mr-2" />
                  Browse by Category
                </CardTitle>
                <CardDescription>
                  Explore workflows organized by business function
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoriesWithDepartments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No categories available yet.
                  </p>
                ) : (
                  categoriesWithDepartments.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <Button
                        variant={params.category === category.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={`/workflows?category=${category.id}`}>
                          <div className="flex items-center justify-between w-full">
                            <span>{category.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {category.departments.reduce((sum, dept) => sum + (dept.workflowCount || 0), 0)}
                            </Badge>
                          </div>
                        </Link>
                      </Button>

                      {/* Show departments if category is selected */}
                      {params.category === category.id && category.departments.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {category.departments.map((department) => (
                            <Button
                              key={department.id}
                              variant={params.department === department.id ? "default" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-sm"
                              asChild
                            >
                              <Link href={`/workflows?category=${category.id}&department=${department.id}`}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{department.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {department.workflowCount || 0}
                                  </Badge>
                                </div>
                              </Link>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {totalWorkflows === 0 && !hasQuery && !hasFilters ? (
              /* No workflows available */
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No Workflows Available
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Check back later as we add more workflow content to the library.
                  </p>
                </CardContent>
              </Card>
            ) : totalWorkflows === 0 ? (
              /* No search results */
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No workflows found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search terms or browse by category.
                  </p>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/workflows">Browse All Categories</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Workflow Results */
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {searchResults.workflows.map((workflow) => (
                    <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg leading-6 truncate">
                              {workflow.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <span className="flex items-center text-sm text-gray-500">
                                <Building2 className="h-3 w-3 mr-1" />
                                {workflow.categoryName} → {workflow.departmentName}
                              </span>
                            </CardDescription>
                          </div>
                          {workflow.external_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={workflow.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {workflow.description}
                          </p>
                        )}

                        {(workflow.source_author || workflow.source_book) && (
                          <div className="space-y-2 text-sm text-gray-500 mb-4">
                            {workflow.source_author && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span>{workflow.source_author}</span>
                              </div>
                            )}
                            {workflow.source_book && (
                              <div className="flex items-center">
                                <BookOpen className="h-3 w-3 mr-1" />
                                <span>{workflow.source_book}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {workflow.fileCount && workflow.fileCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {workflow.fileCount} file{workflow.fileCount === 1 ? "" : "s"}
                              </Badge>
                            )}
                            {workflow.topic && workflow.topic !== workflow.name && (
                              <Badge variant="secondary" className="text-xs">
                                {workflow.topic}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" asChild>
                            <Link href={`/workflows/${workflow.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Load More / Pagination could go here */}
                {searchResults.workflows.length >= 50 && (
                  <div className="text-center pt-6">
                    <p className="text-sm text-gray-500">
                      Showing first 50 results. Use search and filters to narrow down your results.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}