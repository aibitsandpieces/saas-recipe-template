import { Suspense } from "react"
import { Search, Book, Users, Target, Briefcase, X } from "lucide-react"
import { getBookWorkflowDepartments, searchBookWorkflows } from "@/lib/actions/book-workflow.actions"
import { BookWorkflowSearchFilters } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const ACTIVITY_TYPES = [
  { value: "", label: "All Activity Types" },
  { value: "Create", label: "Create" },
  { value: "Assess", label: "Assess" },
  { value: "Plan", label: "Plan" },
  { value: "Workshop", label: "Workshop" }
]

const PROBLEM_GOALS = [
  { value: "", label: "All Problem/Goals" },
  { value: "Grow", label: "Grow" },
  { value: "Optimise", label: "Optimise" },
  { value: "Lead", label: "Lead" },
  { value: "Strategise", label: "Strategise" },
  { value: "Innovate", label: "Innovate" },
  { value: "Understand", label: "Understand" }
]

function getActivityTypeIcon(activityType: string) {
  switch (activityType) {
    case "Create": return "🎨"
    case "Assess": return "📊"
    case "Plan": return "📋"
    case "Workshop": return "👥"
    default: return "💼"
  }
}

function getProblemGoalColor(problemGoal: string) {
  switch (problemGoal) {
    case "Grow": return "bg-green-100 text-green-800"
    case "Optimise": return "bg-blue-100 text-blue-800"
    case "Lead": return "bg-purple-100 text-purple-800"
    case "Strategise": return "bg-orange-100 text-orange-800"
    case "Innovate": return "bg-pink-100 text-pink-800"
    case "Understand": return "bg-gray-100 text-gray-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

function DepartmentSidebar({ departments }: { departments: any[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Browse by Department</h3>
      {departments.map((department) => (
        <Link
          key={department.id}
          href={`/book-workflows/${department.slug}`}
          className="block p-3 rounded-lg hover:bg-gray-50 border transition-colors"
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{department.name}</h4>
              <p className="text-sm text-gray-600">
                {department.workflowCount} workflows
              </p>
            </div>
            <div className="text-gray-400">→</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function SearchFilters({
  filters,
  onUpdateFilters
}: {
  filters: BookWorkflowSearchFilters
  onUpdateFilters: (filters: BookWorkflowSearchFilters) => void
}) {
  const hasActiveFilters = filters.query || filters.activityType || filters.problemGoal

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search workflows..."
              value={filters.query || ""}
              onChange={(e) => onUpdateFilters({ ...filters, query: e.target.value, page: 1 })}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={filters.activityType || ""}
          onValueChange={(value) => onUpdateFilters({ ...filters, activityType: value || undefined, page: 1 })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.problemGoal || ""}
          onValueChange={(value) => onUpdateFilters({ ...filters, problemGoal: value || undefined, page: 1 })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Problem/Goal" />
          </SelectTrigger>
          <SelectContent>
            {PROBLEM_GOALS.map((goal) => (
              <SelectItem key={goal.value} value={goal.value}>
                {goal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={() => onUpdateFilters({ page: 1 })}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex gap-2 flex-wrap">
          {filters.query && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.query}"
              <button
                onClick={() => onUpdateFilters({ ...filters, query: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.activityType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Activity: {filters.activityType}
              <button
                onClick={() => onUpdateFilters({ ...filters, activityType: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.problemGoal && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Goal: {filters.problemGoal}
              <button
                onClick={() => onUpdateFilters({ ...filters, problemGoal: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowCard({ workflow }: { workflow: any }) {
  const workflowUrl = `/book-workflows/${workflow.departmentSlug}/${workflow.categorySlug}/${workflow.bookSlug}/${workflow.slug}`

  return (
    <Link href={workflowUrl}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getActivityTypeIcon(workflow.activity_type)}</span>
              <Badge variant="outline" className="text-xs">
                {workflow.activity_type}
              </Badge>
            </div>
            <Badge className={`text-xs ${getProblemGoalColor(workflow.problem_goal)}`}>
              {workflow.problem_goal}
            </Badge>
          </div>
          <CardTitle className="text-lg leading-tight">
            {workflow.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Book className="h-4 w-4" />
              <span className="font-medium">{workflow.bookTitle}</span>
              <span>by {workflow.bookAuthor}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Briefcase className="h-4 w-4" />
              <span>{workflow.departmentName} → {workflow.categoryName}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function SearchResults({ searchResults }: { searchResults: any }) {
  if (searchResults.totalCount === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
        <p className="text-gray-600">Try adjusting your search criteria or browse by department.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Search Results ({searchResults.totalCount} workflows)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.workflows.map((workflow: any) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>

      {searchResults.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
          {searchResults.pagination.hasPreviousPage && (
            <Button variant="outline" size="sm">
              Previous
            </Button>
          )}
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {searchResults.pagination.page} of {searchResults.pagination.totalPages}
          </span>
          {searchResults.pagination.hasNextPage && (
            <Button variant="outline" size="sm">
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function DepartmentOverview({ departments }: { departments: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Book Workflows</h2>
        <p className="text-gray-600">
          Discover 3,000+ proven workflows from business books, organized by department and expertise area.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <Link key={department.id} href={`/book-workflows/${department.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {department.name}
                  <div className="text-gray-400">→</div>
                </CardTitle>
                <CardDescription>
                  {department.workflowCount} workflows across {department.categoryCount} categories
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

async function BookWorkflowsContent({ searchParams }: { searchParams: any }) {
  // Parse search parameters
  const filters: BookWorkflowSearchFilters = {
    query: searchParams.q || undefined,
    activityType: searchParams.activity || undefined,
    problemGoal: searchParams.goal || undefined,
    page: parseInt(searchParams.page) || 1,
    limit: 20
  }

  const hasSearchCriteria = filters.query || filters.activityType || filters.problemGoal

  // Fetch data based on whether we're searching or browsing
  const [departments, searchResults] = await Promise.all([
    getBookWorkflowDepartments(),
    hasSearchCriteria ? searchBookWorkflows(filters) : Promise.resolve(null)
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - only show when browsing */}
        {!hasSearchCriteria && (
          <div className="lg:col-span-1">
            <DepartmentSidebar departments={departments} />
          </div>
        )}

        {/* Main Content */}
        <div className={hasSearchCriteria ? "lg:col-span-4" : "lg:col-span-3"}>
          {/* Search and Filters */}
          <div className="mb-8">
            <SearchFilters
              filters={filters}
              onUpdateFilters={(newFilters) => {
                const params = new URLSearchParams()
                if (newFilters.query) params.set('q', newFilters.query)
                if (newFilters.activityType) params.set('activity', newFilters.activityType)
                if (newFilters.problemGoal) params.set('goal', newFilters.problemGoal)
                if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page.toString())

                const newUrl = params.toString() ? `?${params.toString()}` : '/book-workflows'
                window.location.href = newUrl
              }}
            />
          </div>

          {/* Content */}
          {hasSearchCriteria && searchResults ? (
            <SearchResults searchResults={searchResults} />
          ) : (
            <DepartmentOverview departments={departments} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookWorkflowsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <BookWorkflowsContent searchParams={searchParams} />
    </Suspense>
  )
}