import { getEnrolledCourses } from "@/lib/actions/user-course.actions"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default async function CoursesPage() {
  const courses = await getEnrolledCourses()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
        <p className="text-gray-600">
          Continue learning and track your progress across all enrolled courses.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses available</h3>
          <p className="text-gray-500">
            You're not enrolled in any courses yet. Contact your administrator to get access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="p-0">
                {course.thumbnail_url ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={course.thumbnail_url}
                      alt={course.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                    {course.name}
                  </h3>
                  {course.progress && course.progress.percentage === 100 && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                  )}
                </div>

                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                )}

                {course.progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{course.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{course.progress.completed_lessons} of {course.progress.total_lessons} lessons</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {course.progress.percentage === 100 ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href={`/courses/${course.slug}`}>
                    {course.progress && course.progress.percentage > 0 ? 'Continue Course' : 'Start Course'}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}