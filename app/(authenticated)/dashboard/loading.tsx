import { Card, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Loading skeleton for dashboard */}
      <div className="h-9 w-64 bg-gray-200 animate-pulse rounded mb-8"></div>

      {/* Quick Link Cards Loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-40 bg-gray-100 rounded"></div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Platform Admin Stats Loading */}
      <div className="border-t pt-8">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-12 bg-gray-100 rounded"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}