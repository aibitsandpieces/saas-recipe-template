'use client'

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CategoryErrorStateProps {
  departmentSlug: string
  categorySlug: string
  onRetry?: () => void
}

export default function CategoryErrorState({
  departmentSlug,
  categorySlug,
  onRetry
}: CategoryErrorStateProps) {
  const handleRefresh = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Fallback to page refresh
      window.location.reload()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb for context */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Link href="/book-workflows" className="hover:text-gray-900">
          Book Workflows
        </Link>
        <span>/</span>
        <Link
          href={`/book-workflows/${departmentSlug}`}
          className="hover:text-gray-900"
        >
          {departmentSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </nav>

      {/* Back button */}
      <div className="mb-8">
        <Link href={`/book-workflows/${departmentSlug}`}>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Department
          </Button>
        </Link>
      </div>

      {/* Error Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Unable to Load Category
          </CardTitle>
          <CardDescription className="text-base">
            We encountered an issue while loading the "{categorySlug.replace(/-/g, ' ')}" category.
            This might be a temporary problem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/book-workflows/${departmentSlug}`}>
                Browse Other Categories
              </Link>
            </Button>
          </div>

          {/* Help text */}
          <div className="text-center text-sm text-gray-500 mt-6 pt-4 border-t">
            <p>If this issue persists, the category might not exist or there could be a temporary server issue.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}