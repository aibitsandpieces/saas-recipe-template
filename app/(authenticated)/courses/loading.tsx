import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CoursesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 bg-muted animate-pulse rounded w-48 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="p-0">
              <div className="w-full h-48 bg-muted animate-pulse rounded-t-lg" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2 mt-4" />
              </div>
            </CardContent>
            <CardContent className="pt-0 pb-6">
              <div className="h-10 bg-muted animate-pulse rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}