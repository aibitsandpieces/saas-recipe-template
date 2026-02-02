"use client"

import React, { useState, useEffect } from "react"
import { getEnrolledLesson, completeLesson, uncompleteLesson } from "@/lib/actions/user-course.actions"
import { parseVimeoUrl } from "@/lib/utils/vimeo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Play
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface LessonPageProps {
  params: Promise<{ slug: string; lessonSlug: string }>
}

interface LessonData {
  course: {
    id: string
    name: string
    slug: string
    description: string | null
    is_published: boolean | null
    created_at: string | null
    updated_at: string | null
    thumbnail_url: string | null
    sort_order: number | null
  }
  lesson: {
    id: string
    module_id: string
    name: string
    slug: string
    html_content: string | null
    vimeo_embed_code: string | null
    sort_order: number | null
    created_at: string | null
    updated_at: string | null
    files: Array<{
      id: string
      lesson_id: string
      file_name: string
      display_name: string
      storage_path: string
      file_size_bytes: number | null
      sort_order: number | null
      created_at: string | null
    }>
    user_progress?: {
      id: string
      user_id: string
      lesson_id: string
      completed_at: string | null
      last_accessed_at: string | null
    }
    module: {
      id: string
      course_id: string
      name: string
      description: string | null
      sort_order: number | null
      created_at: string | null
      updated_at: string | null
    }
  }
}

export default function LessonPage({ params }: LessonPageProps) {
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    params.then(async (p) => {
      try {
        const data = await getEnrolledLesson(p.slug, p.lessonSlug)
        setLessonData(data)
      } catch (error) {
        console.error("Error loading lesson:", error)
        toast.error("Failed to load lesson")
      } finally {
        setIsLoading(false)
      }
    })
  }, [params])

  async function handleToggleCompletion() {
    if (!lessonData) return

    setIsUpdating(true)

    try {
      const isCompleted = !!lessonData.lesson.user_progress?.completed_at

      if (isCompleted) {
        await uncompleteLesson(lessonData.lesson.id)
        toast.success("Lesson marked as incomplete")
      } else {
        await completeLesson(lessonData.lesson.id)
        toast.success("Lesson completed! 🎉")
      }

      // Refresh lesson data
      const refreshedData = await getEnrolledLesson(
        lessonData.course.slug,
        lessonData.lesson.slug
      )
      if (refreshedData) {
        setLessonData(refreshedData)
      }
    } catch (error) {
      console.error("Error updating lesson progress:", error)
      toast.error("Failed to update lesson progress")
    } finally {
      setIsUpdating(false)
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "Unknown size"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading lesson...</div>
        </div>
      </div>
    )
  }

  if (!lessonData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson not found</h1>
          <p className="text-gray-500 mb-4">
            This lesson doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { course, lesson } = lessonData
  const isCompleted = !!lesson.user_progress?.completed_at

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/courses/${course.slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {course.name}
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{lesson.module.name}</p>
            <h1 className="text-3xl font-bold text-gray-900">{lesson.name}</h1>
          </div>

          <Button
            onClick={handleToggleCompletion}
            disabled={isUpdating}
            variant={isCompleted ? "outline" : "default"}
            className="flex items-center space-x-2"
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark Incomplete</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                <span>Mark Complete</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Video Section */}
        {lesson.vimeo_embed_code && (() => {
          const { embedUrl } = parseVimeoUrl(lesson.vimeo_embed_code)
          return embedUrl ? (
            <Card>
              <CardContent className="p-0">
                <div className="relative w-full aspect-video">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full rounded-t-lg"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={lesson.name}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>Unable to load video. Please check the Vimeo URL.</p>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Content Section */}
        {lesson.html_content && (
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
              <FileText className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Lesson Content</h2>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
                dangerouslySetInnerHTML={{ __html: lesson.html_content }}
              />
            </CardContent>
          </Card>
        )}

        {/* Files Section */}
        {lesson.files.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
              <Download className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Downloads</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lesson.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-semibold">
                          {file.file_name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{file.display_name}</h4>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.file_size_bytes)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/api/files/download/${file.id}`}
                        download={file.file_name}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!lesson.vimeo_embed_code && !lesson.html_content && lesson.files.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No content yet</h3>
                <p className="text-gray-500">
                  This lesson doesn't have any content yet. Check back later for updates.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completion Status Footer */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {isCompleted ? (
              <span className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Lesson completed
              </span>
            ) : (
              <span>Mark this lesson as complete when you're finished</span>
            )}
          </div>

          <Button
            onClick={handleToggleCompletion}
            disabled={isUpdating}
            variant={isCompleted ? "outline" : "default"}
          >
            {isUpdating ? "Updating..." : isCompleted ? "Mark Incomplete" : "Mark Complete"}
          </Button>
        </div>
      </div>
    </div>
  )
}