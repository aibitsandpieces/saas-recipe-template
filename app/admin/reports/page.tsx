import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/user"

export default async function AdminReportsPage() {
  // Only platform admins can access reports
  await requirePlatformAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analytics and reporting dashboard (coming soon)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
              User Analytics
            </CardTitle>
            <CardDescription>
              Track user engagement and activity patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Monitor user registration, login frequency, and feature usage across all organizations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">🎓</span>
              </div>
              Course Performance
            </CardTitle>
            <CardDescription>
              Course completion rates and learning outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Analyze course completion statistics, user progress, and content effectiveness.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">⚡</span>
              </div>
              Workflow Usage
            </CardTitle>
            <CardDescription>
              Workflow execution and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Track workflow usage patterns, execution times, and success rates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">🏢</span>
              </div>
              Organization Insights
            </CardTitle>
            <CardDescription>
              Cross-organization performance comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Compare metrics across organizations and identify growth opportunities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">📈</span>
              </div>
              Revenue Analytics
            </CardTitle>
            <CardDescription>
              Subscription and billing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Monitor subscription trends, churn rates, and revenue metrics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">📋</span>
              </div>
              Custom Reports
            </CardTitle>
            <CardDescription>
              Build and schedule custom analytics reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Create tailored reports with custom metrics and automated delivery.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Reports functionality is currently in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-gray-600">
              The reports dashboard will provide comprehensive analytics including:
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Real-time user activity monitoring
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Course completion tracking
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  Workflow performance metrics
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  Organization benchmarking
                </li>
              </ul>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                  Revenue and subscription analytics
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                  Custom report builder
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                  Automated report scheduling
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                  Data export capabilities
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}