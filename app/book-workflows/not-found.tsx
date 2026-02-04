import { BookOpen, Home, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BookWorkflowsNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-base">
            The book workflow page you're looking for doesn't exist or may have been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Navigation options */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/book-workflows" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Browse Book Workflows
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Suggestions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">What you can do:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check the URL for any typos</li>
              <li>• Browse available departments and categories</li>
              <li>• Use the search functionality to find specific content</li>
              <li>• Return to the main book workflows page</li>
            </ul>
          </div>

          {/* Popular sections */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>
              Looking for something specific? Try browsing our{' '}
              <Link href="/book-workflows" className="text-blue-600 hover:underline">
                available departments and categories
              </Link>{' '}
              to find what you need.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}