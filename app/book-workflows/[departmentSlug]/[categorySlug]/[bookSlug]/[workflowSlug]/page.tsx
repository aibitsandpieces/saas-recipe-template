import { Suspense } from "react"
import { ArrowLeft, Book, Target, User, Calendar } from "lucide-react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getBookWorkflow } from "@/lib/actions/book-workflow.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: {
    departmentSlug: string
    categorySlug: string
    bookSlug: string
    workflowSlug: string
  }
}

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

function Breadcrumb({ workflow }: { workflow: any }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Link href="/book-workflows" className="hover:text-gray-900">
        Book Workflows
      </Link>
      <span>/</span>
      <Link
        href={`/book-workflows/${workflow.departmentSlug}`}
        className="hover:text-gray-900"
      >
        {workflow.departmentName}
      </Link>
      <span>/</span>
      <Link
        href={`/book-workflows/${workflow.departmentSlug}/${workflow.categorySlug}`}
        className="hover:text-gray-900"
      >
        {workflow.categoryName}
      </Link>
      <span>/</span>
      <Link
        href={`/book-workflows/${workflow.departmentSlug}/${workflow.categorySlug}/${workflow.bookSlug}`}
        className="hover:text-gray-900"
      >
        {workflow.bookTitle}
      </Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">{workflow.name}</span>
    </nav>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function WorkflowPageContent({
  params
}: {
  params: { departmentSlug: string, categorySlug: string, bookSlug: string, workflowSlug: string }
}) {
  const workflow = await getBookWorkflow(
    params.departmentSlug,
    params.categorySlug,
    params.bookSlug,
    params.workflowSlug
  )

  if (!workflow) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Breadcrumb workflow={workflow} />

        <div className="flex items-center gap-4 mb-6">
          <Link href={`/book-workflows/${params.departmentSlug}/${params.categorySlug}/${params.bookSlug}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {workflow.bookTitle}
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {/* Title and badges */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{getActivityTypeIcon(workflow.activity_type)}</span>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold leading-tight">{workflow.name}</h1>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {workflow.activity_type}
                  </Badge>
                  <Badge className={`text-sm ${getProblemGoalColor(workflow.problem_goal)}`}>
                    {workflow.problem_goal}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Book information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Book className="h-5 w-5" />
                Source Book
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-semibold">{workflow.bookTitle}</div>
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>by {workflow.bookAuthor}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {workflow.departmentName} → {workflow.categoryName}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {workflow.content ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Workflow Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {workflow.content}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Content coming soon</h3>
              <p className="text-gray-600">
                Detailed workflow content will be added in future updates.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Workflow Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">Activity Type</div>
                <div className="text-gray-600">{workflow.activity_type}</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Problem/Goal</div>
                <div className="text-gray-600">{workflow.problem_goal}</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Department</div>
                <div className="text-gray-600">{workflow.departmentName}</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Category</div>
                <div className="text-gray-600">{workflow.categoryName}</div>
              </div>
              {workflow.created_at && (
                <div>
                  <div className="font-medium text-gray-900">Added</div>
                  <div className="text-gray-600">{formatDate(workflow.created_at)}</div>
                </div>
              )}
              {workflow.updated_at && workflow.updated_at !== workflow.created_at && (
                <div>
                  <div className="font-medium text-gray-900">Last Updated</div>
                  <div className="text-gray-600">{formatDate(workflow.updated_at)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function WorkflowPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <WorkflowPageContent params={params} />
    </Suspense>
  )
}

export async function generateStaticParams() {
  // This will be populated when workflows are imported
  // For now, return empty array to allow dynamic generation
  return []
}