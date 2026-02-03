'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BookWorkflowsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Book Workflows error page triggered:', {
      error: {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        name: error.name,
      },
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    })
  }, [error])

  const handleRefresh = () => {
    // Force a page refresh
    window.location.reload()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Book Workflows Error
          </CardTitle>
          <CardDescription className="text-base">
            We encountered an error while loading the book workflows section.
            This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            <Button asChild variant="outline">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 p-4 bg-gray-50 rounded-lg">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                Error Details (Development)
              </summary>
              <div className="mt-3 space-y-2 text-xs font-mono">
                <div>
                  <strong>Message:</strong> {error.message}
                </div>
                {error.digest && (
                  <div>
                    <strong>Digest:</strong> {error.digest}
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-red-600 max-h-60 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Help text */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>
              If this error continues, please try refreshing the page or check back later.
              The issue has been automatically logged for investigation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}