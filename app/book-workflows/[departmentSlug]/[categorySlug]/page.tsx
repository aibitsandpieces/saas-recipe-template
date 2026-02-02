import { Suspense } from "react"
import { ArrowLeft, Book, Target, User } from "lucide-react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getBookWorkflowCategory, getBooksByCategory } from "@/lib/actions/book-workflow.actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: {
    departmentSlug: string
    categorySlug: string
  }
}

function BookCard({ book, departmentSlug, categorySlug }: {
  book: any,
  departmentSlug: string,
  categorySlug: string
}) {
  return (
    <Link href={`/book-workflows/${departmentSlug}/${categorySlug}/${book.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg leading-tight flex items-center justify-between">
            <span className="line-clamp-2">{book.title}</span>
            <div className="text-gray-400">→</div>
          </CardTitle>
          <CardDescription className="space-y-2">
            <div className="flex items-center gap-1 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">{book.author}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Target className="h-4 w-4" />
              <span>{book.workflowCount} workflows</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}

function Breadcrumb({ category }: { category: any }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Link href="/book-workflows" className="hover:text-gray-900">
        Book Workflows
      </Link>
      <span>/</span>
      <Link
        href={`/book-workflows/${category.departmentSlug}`}
        className="hover:text-gray-900"
      >
        {category.departmentName}
      </Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">{category.name}</span>
    </nav>
  )
}

async function CategoryPageContent({ params }: { params: { departmentSlug: string, categorySlug: string } }) {
  const [category, books] = await Promise.all([
    getBookWorkflowCategory(params.departmentSlug, params.categorySlug),
    getBooksByCategory(params.departmentSlug, params.categorySlug)
  ])

  if (!category) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Breadcrumb category={category} />

        <div className="flex items-center gap-4 mb-4">
          <Link href={`/book-workflows/${params.departmentSlug}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {category.departmentName}
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{books.length} books</span>
            <span>•</span>
            <span>{category.workflowCount} workflows</span>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {books.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              departmentSlug={params.departmentSlug}
              categorySlug={params.categorySlug}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books available</h3>
          <p className="text-gray-600">
            This category doesn't have any books yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default function CategoryPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
      <CategoryPageContent params={params} />
    </Suspense>
  )
}

export async function generateStaticParams() {
  // This will be populated when workflows are imported
  // For now, return empty array to allow dynamic generation
  return []
}