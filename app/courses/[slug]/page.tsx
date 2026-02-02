import { getEnrolledCourse } from "@/lib/actions/user-course.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  FileText,
  Download
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const course = await getEnrolledCourse(slug)

  if (!course) {
    notFound()
  }

  // Calculate progress
  const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0)
  const completedLessons = course.modules.reduce(
    (acc, module) => acc + module.lessons.filter(lesson => lesson.user_progress?.completed_at).length,
    0
  )
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
        </Button>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
            {course.description && (
              <p className="text-gray-600 mt-2 text-lg">{course.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              {course.modules.length} modules
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {totalLessons} lessons
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {completedLessons} completed
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Course Progress</span>
              <span className="text-sm font-bold text-gray-900">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {course.modules.map((module, moduleIndex) => {
          const moduleLessons = module.lessons.length
          const moduleCompleted = module.lessons.filter(l => l.user_progress?.completed_at).length
          const moduleProgress = moduleLessons > 0 ? Math.round((moduleCompleted / moduleLessons) * 100) : 0

          return (
            <Card key={module.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                        {moduleIndex + 1}
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">{module.name}</h2>
                    </div>
                    {module.description && (
                      <p className="text-gray-600 ml-11">{module.description}</p>
                    )}
                  </div>
                  <Badge variant={moduleProgress === 100 ? "default" : "secondary"}>
                    {moduleProgress}% complete
                  </Badge>
                </div>

                {moduleLessons > 0 && (
                  <div className="ml-11">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${moduleProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {moduleCompleted} of {moduleLessons} lessons
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {module.lessons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-8 w-8 mx-auto mb-2" />
                    <p>No lessons in this module yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isCompleted = !!lesson.user_progress?.completed_at
                      const hasVideo = !!lesson.vimeo_embed_code
                      const hasContent = !!lesson.html_content
                      const hasFiles = lesson.files.length > 0

                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex items-center justify-center w-6 h-6 text-xs font-medium">
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <span className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center text-xs">
                                  {lessonIndex + 1}
                                </span>
                              )}
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{lesson.name}</h4>
                              <div className="flex items-center space-x-3 mt-1">
                                {hasVideo && (
                                  <span className="inline-flex items-center text-xs text-blue-600">
                                    <Play className="h-3 w-3 mr-1" />
                                    Video
                                  </span>
                                )}
                                {hasContent && (
                                  <span className="inline-flex items-center text-xs text-gray-600">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Content
                                  </span>
                                )}
                                {hasFiles && (
                                  <span className="inline-flex items-center text-xs text-gray-600">
                                    <Download className="h-3 w-3 mr-1" />
                                    {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button size="sm" asChild>
                            <Link href={`/courses/${course.slug}/${lesson.slug}`}>
                              {isCompleted ? 'Review' : 'Start'}
                            </Link>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {course.modules.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Course content coming soon</h3>
              <p className="text-gray-500">
                This course doesn't have any modules yet. Check back later for updates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}