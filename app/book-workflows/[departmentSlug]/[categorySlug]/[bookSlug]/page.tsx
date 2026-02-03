import { Suspense } from "react"
import { ArrowLeft, Target, User } from "lucide-react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getBookWithWorkflows } from "@/lib/actions/book-workflow.actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: Promise<{
    departmentSlug: string
    categorySlug: string
    bookSlug: string
  }>
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

function WorkflowCard({ workflow, departmentSlug, categorySlug, bookSlug }: {
  workflow: any,
  departmentSlug: string,
  categorySlug: string,
  bookSlug: string
}) {
  const workflowUrl = `/book-workflows/${departmentSlug}/${categorySlug}/${bookSlug}/${workflow.slug}`

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
      </Card>
    </Link>
  )
}

function Breadcrumb({ book }: { book: any }) {
  if (!book.workflows[0]) return null

  const workflow = book.workflows[0]

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
      <span className="text-gray-900 font-medium">{book.title}</span>
    </nav>
  )
}

async function BookPageContent({ params }: { params: Promise<{ departmentSlug: string, categorySlug: string, bookSlug: string }> }) {
  const { departmentSlug, categorySlug, bookSlug } = await params
  const book = await getBookWithWorkflows(bookSlug)

  if (!book) {
    notFound()
  }

  // Filter workflows by the current category (book might have workflows in multiple categories)
  const categoryWorkflows = book.workflows.filter(workflow =>
    workflow.categorySlug === categorySlug &&
    workflow.departmentSlug === departmentSlug
  )

  if (categoryWorkflows.length === 0) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Breadcrumb book={book} />

        <div className="flex items-center gap-4 mb-4">
          <Link href={`/book-workflows/${departmentSlug}/${categorySlug}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {categoryWorkflows[0]?.categoryName}
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <div className="flex items-center gap-1 text-lg text-gray-600 mt-2">
              <User className="h-5 w-5" />
              <span>by {book.author}</span>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-gray-600">
            <span>{categoryWorkflows.length} workflows in this category</span>
            {book.workflowCount && book.workflowCount > categoryWorkflows.length && (
              <>
                <span>•</span>
                <span>{book.workflowCount} total workflows across all categories</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            departmentSlug={departmentSlug}
            categorySlug={categorySlug}
            bookSlug={bookSlug}
          />
        ))}
      </div>
    </div>
  )
}

export default function BookPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <BookPageContent params={params} />
    </Suspense>
  )
}

export async function generateStaticParams() {
  // This will be populated when workflows are imported
  // For now, return empty array to allow dynamic generation
  return []
}