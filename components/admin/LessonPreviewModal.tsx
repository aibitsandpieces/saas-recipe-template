"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Download, X, ExternalLink } from "lucide-react"
import Link from "next/link"
import { getLesson } from "@/lib/actions/course.actions"
import { toast } from "sonner"

interface LessonPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  moduleId: string
  lessonId: string
  lessonName?: string
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

export function LessonPreviewModal({
  isOpen,
  onClose,
  courseId,
  moduleId,
  lessonId,
  lessonName
}: LessonPreviewModalProps) {
  const [lesson, setLesson] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && lessonId) {
      loadLessonData()
    }
  }, [isOpen, lessonId])

  const loadLessonData = async () => {
    setIsLoading(true)
    try {
      const lessonData = await getLesson(lessonId)
      setLesson(lessonData)
    } catch (error) {
      console.error("Error loading lesson:", error)
      toast.error("Failed to load lesson preview")
    } finally {
      setIsLoading(false)
    }
  }

  const vimeoId = lesson ? extractVimeoId(lesson.vimeo_embed_code || "") : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                <Eye className="w-3 h-3 mr-1" />
                Preview Mode
              </Badge>
              <span>Lesson Preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Screen
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading lesson preview...</p>
              </div>
            </div>
          ) : lesson ? (
            <div className="space-y-6">
              {/* Lesson Header */}
              <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">{lesson.name}</h1>
                {lesson.module && (
                  <p className="mt-1 text-sm text-gray-500">
                    Module: {lesson.module.name}
                  </p>
                )}
              </div>

              {/* Video Section */}
              {vimeoId && (
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
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
              <div>
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
                <div>
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
                          <Link href={`/api/files/download/${file.id}`} target="_blank">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Notes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Preview Notes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• This preview shows exactly how students will see this lesson</li>
                  <li>• Video permissions and download access are active in preview mode</li>
                  <li>• Student progress tracking is disabled in preview mode</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Failed to load lesson preview.</p>
              <Button
                variant="outline"
                onClick={loadLessonData}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}