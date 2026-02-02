import { getCourse } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Eye, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdminActionDropdown } from "@/components/admin/AdminActionDropdown"

interface CoursePageProps {
  params: Promise<{ id: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params
  const course = await getCourse(id)

  if (!course) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
              <Badge variant={course.is_published ? "default" : "secondary"}>
                {course.is_published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage course content and structure
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/courses/${course.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Course
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/courses/${course.id}/enrollments`}>
              Manage Enrollments
            </Link>
          </Button>
          {course.is_published && (
            <Button asChild>
              <Link href={`/courses/${course.slug}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Course
              </Link>
            </Button>
          )}
        </div>
      </div>

      {course.description && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700">{course.description}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Course Content</h2>
          <Button asChild>
            <Link href={`/admin/courses/${course.id}/modules/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Link>
          </Button>
        </div>

        {!course.modules || course.modules.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No modules yet</p>
            <Button asChild>
              <Link href={`/admin/courses/${course.id}/modules/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Module
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(course.modules || [])
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((module) => (
                <div key={module.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {module.name}
                      </h3>
                      {module.description && (
                        <p className="text-gray-600 mt-1">{module.description}</p>
                      )}
                    </div>
                    <AdminActionDropdown
                      type="module"
                      courseId={course.id}
                      moduleId={module.id}
                      moduleName={module.name}
                    />
                  </div>

                  {!module.lessons || module.lessons.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">No lessons in this module</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/courses/${course.id}/modules/${module.id}/lessons/new`}>
                          Add First Lesson
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(module.lessons || [])
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map((lesson, index) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {lesson.name}
                                </h4>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <code>{lesson.slug}</code>
                                  {lesson.vimeo_embed_code && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                      Video
                                    </span>
                                  )}
                                  {lesson.html_content && (
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                      Content
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <AdminActionDropdown
                              type="lesson"
                              courseId={course.id}
                              moduleId={module.id}
                              lessonId={lesson.id}
                              lessonName={lesson.name}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}