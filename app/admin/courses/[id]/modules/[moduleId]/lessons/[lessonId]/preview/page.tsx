import React from "react"
import { getLesson } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, FileText, Download } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface LessonPreviewPageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>
}

// Helper to extract Vimeo video ID from various formats
function extractVimeoId(vimeoCode: string): string | null {
  if (!vimeoCode) return null

  // Handle direct video ID
  if (/^\d+$/.test(vimeoCode)) {
    return vimeoCode
  }

  // Handle full Vimeo URLs
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ]

  for (const pattern of patterns) {
    const match = vimeoCode.match(pattern)
    if (match) return match[1]
  }

  return null
}

export default async function LessonPreviewPage({ params }: LessonPreviewPageProps) {
  const { id: courseId, moduleId, lessonId } = await params
  const lesson = await getLesson(lessonId)

  if (!lesson) {
    notFound()
  }

  const vimeoId = extractVimeoId(lesson.vimeo_embed_code || "")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              <Eye className="w-3 h-3 mr-1" />
              Preview Mode
            </Badge>
            <span className="text-sm text-yellow-800">
              This is how the lesson will appear to students
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/edit`}>
                Edit Lesson
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/courses/${courseId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Lesson Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{lesson.name}</h1>
            {lesson.module && (
              <p className="mt-1 text-sm text-gray-500">
                Module: {lesson.module.name}
              </p>
            )}
          </div>

          {/* Video Section */}
          {vimeoId && (
            <div className="relative aspect-video bg-gray-900">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                className="absolute inset-0 w-full h-full"
                title={lesson.name}
              />
            </div>
          )}

          {/* Content Section */}
          <div className="p-6">
            {lesson.html_content && (
              <div className="prose max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: lesson.html_content }}
                  className="text-gray-700 leading-relaxed"
                />
              </div>
            )}

            {!lesson.html_content && !vimeoId && (
              <div className="text-center py-12 text-gray-500">
                <p>This lesson doesn't have any content yet.</p>
                <p className="text-sm mt-2">
                  Add video or written content in the lesson editor.
                </p>
              </div>
            )}
          </div>

          {/* Files Section */}
          {lesson.files && lesson.files.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lesson Resources
              </h3>
              <div className="space-y-3">
                {lesson.files.map((file: any) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {file.display_name}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span>
                            {file.file_name.split('.').pop()?.toUpperCase()}
                          </span>
                          {file.file_size_bytes && (
                            <span>
                              {(file.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/api/files/download/${file.id}`}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Notes */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Preview Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• This preview shows exactly how students will see this lesson</li>
            <li>• Video permissions and download access are active in preview mode</li>
            <li>• Student progress tracking is disabled in preview mode</li>
          </ul>
        </div>
      </div>
    </div>
  )
}