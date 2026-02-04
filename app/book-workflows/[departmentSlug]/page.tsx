import { Suspense } from "react"
import { ArrowLeft, Book, Target } from "lucide-react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getBookWorkflowDepartmentBySlug } from "@/lib/actions/book-workflow.actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: Promise<{ departmentSlug: string }>
}

function CategoryCard({ category, departmentSlug }: { category: any, departmentSlug: string }) {
  return (
    <Link href={`/book-workflows/${departmentSlug}/${category.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {category.name}
            <div className="text-gray-400">→</div>
          </CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Book className="h-4 w-4" />
              <span>{category.bookCount} books</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{category.workflowCount} workflows</span>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

async function DepartmentPageContent({ params }: { params: Promise<{ departmentSlug: string }> }) {
  const { departmentSlug } = await params
  const department = await getBookWorkflowDepartmentBySlug(departmentSlug)

  if (!department) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/book-workflows">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Departments
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{department.name}</h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{department.categories.length} categories</span>
            <span>•</span>
            <span>{department.workflowCount} total workflows</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {department.categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {department.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              departmentSlug={departmentSlug}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories available</h3>
          <p className="text-gray-600">
            This department doesn't have any categories yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default function DepartmentPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <DepartmentPageContent params={params} />
    </Suspense>
  )
}

export async function generateStaticParams() {
  // This will be populated when workflows are imported
  // For now, return empty array to allow dynamic generation
  return []
}