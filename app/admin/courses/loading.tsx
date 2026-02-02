import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AdminCoursesLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-muted animate-pulse rounded w-48 mb-2" />
          <div className="h-4 bg-muted animate-pulse rounded w-64" />
        </div>
        <div className="h-10 bg-muted animate-pulse rounded w-32" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-muted animate-pulse rounded w-20 mb-2" />
                  <div className="h-8 bg-muted animate-pulse rounded w-12" />
                </div>
                <div className="w-8 h-8 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-32" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="h-4 bg-muted animate-pulse rounded w-16" /></TableHead>
                <TableHead><div className="h-4 bg-muted animate-pulse rounded w-12" /></TableHead>
                <TableHead><div className="h-4 bg-muted animate-pulse rounded w-16" /></TableHead>
                <TableHead><div className="h-4 bg-muted animate-pulse rounded w-20" /></TableHead>
                <TableHead className="text-right"><div className="h-4 bg-muted animate-pulse rounded w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-32" />
                      <div className="h-3 bg-muted animate-pulse rounded w-48" />
                    </div>
                  </TableCell>
                  <TableCell><div className="h-5 bg-muted animate-pulse rounded w-16" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded w-8" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded w-8" /></TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 bg-muted animate-pulse rounded w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}