import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="h-9 bg-muted animate-pulse rounded w-32" />
            <div className="flex items-center space-x-3">
              <div className="h-6 bg-muted animate-pulse rounded w-20" />
              <div className="h-6 bg-muted animate-pulse rounded w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Course Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-muted animate-pulse rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted animate-pulse rounded w-32" />
          </div>

          {/* Progress Card Skeleton */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-32" />
                <div className="h-4 bg-muted animate-pulse rounded w-12" />
              </div>
              <div className="w-full bg-muted animate-pulse rounded-full h-3 mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-40" />
            </CardContent>
          </Card>

          {/* Modules Skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                        <div className="h-6 bg-muted animate-pulse rounded w-48" />
                      </div>
                      <div className="h-4 bg-muted animate-pulse rounded w-64 ml-11" />
                    </div>
                    <div className="h-6 bg-muted animate-pulse rounded w-20" />
                  </div>
                  <div className="ml-11">
                    <div className="w-full bg-muted animate-pulse rounded-full h-2 mb-1" />
                    <div className="h-3 bg-muted animate-pulse rounded w-32" />
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-5 h-5 bg-muted animate-pulse rounded-full" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted animate-pulse rounded w-48 mb-1" />
                            <div className="h-3 bg-muted animate-pulse rounded w-32" />
                          </div>
                        </div>
                        <div className="h-8 bg-muted animate-pulse rounded w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}