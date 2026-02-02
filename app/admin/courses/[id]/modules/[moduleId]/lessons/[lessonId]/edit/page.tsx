"use client"

import React, { useState, useEffect } from "react"
import { updateLesson, getLesson, updateLessonWithFiles, deleteFile } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FileText, Upload, X, Trash2, Eye, Play, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LessonPreviewModal } from "@/components/admin/LessonPreviewModal"

interface EditLessonPageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>
}

export default function EditLessonPage({ params }: EditLessonPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [courseId, setCourseId] = useState<string>("")
  const [lessonId, setLessonId] = useState<string>("")
  const [lessonData, setLessonData] = useState<any>(null)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // Unwrap params and fetch lesson data
  useEffect(() => {
    params.then(async (p) => {
      setCourseId(p.id)
      setLessonId(p.lessonId)

      try {
        const lesson = await getLesson(p.lessonId)
        setLessonData(lesson)
      } catch (error) {
        console.error("Error loading lesson:", error)
        toast.error("Failed to load lesson data")
      } finally {
        setIsLoadingData(false)
      }
    })
  }, [params])

  async function onSubmit(formData: FormData) {
    if (!lessonId) return

    setIsLoading(true)

    try {
      const data = {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        html_content: formData.get("html_content") as string,
        vimeo_embed_code: formData.get("vimeo_embed_code") as string,
        sort_order: parseInt(formData.get("sort_order") as string) || 0,
      }

      if (newFiles.length > 0) {
        await updateLessonWithFiles(lessonId, data, newFiles)
        toast.success(`Lesson updated with ${newFiles.length} new file${newFiles.length > 1 ? 's' : ''}!`)
      } else {
        await updateLesson(lessonId, data)
        toast.success("Lesson updated successfully!")
      }

      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      console.error("Error updating lesson:", error)
      toast.error("Failed to update lesson. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleNewFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || [])
    setNewFiles(prev => [...prev, ...selectedFiles])
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDragEnter(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()

    const droppedFiles = Array.from(event.dataTransfer.files)
    const validFiles = droppedFiles.filter(file => {
      const validTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return validTypes.includes(extension)
    })

    if (validFiles.length > 0) {
      setNewFiles(prev => [...prev, ...validFiles])
    }

    if (droppedFiles.length > validFiles.length) {
      toast.error('Some files were rejected. Only PDF, DOC, DOCX, XLS, XLSX files are allowed.')
    }
  }

  function removeNewFile(index: number) {
    setNewFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function deleteExistingFile(fileId: string, fileName: string) {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingFiles(prev => new Set(prev).add(fileId))

    try {
      await deleteFile(fileId)
      toast.success("File deleted successfully!")

      // Refresh lesson data
      const refreshedLesson = await getLesson(lessonId)
      setLessonData(refreshedLesson)
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Failed to delete file. Please try again.")
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  if (!courseId || !lessonId || isLoadingData) return <div>Loading...</div>

  if (!lessonData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson not found</h1>
        <p className="text-gray-500 mb-4">This lesson doesn't exist or you don't have access to it.</p>
        <Button asChild>
          <Link href={`/admin/courses/${courseId}`}>Back to Course</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/courses/${courseId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Lesson</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update lesson content and details
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form action={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Lesson Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Enter lesson name"
                defaultValue={lessonData.name || ""}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                type="text"
                required
                placeholder="lesson-slug"
                pattern="^[a-z0-9-]+$"
                title="Slug must contain only lowercase letters, numbers, and hyphens"
                defaultValue={lessonData.slug || ""}
              />
              <p className="mt-1 text-xs text-gray-500">
                URL-friendly identifier (lowercase letters, numbers, and hyphens only)
              </p>
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={lessonData.sort_order || 0}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Lower numbers appear first in the module
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="vimeo_embed_code">Vimeo Video</Label>
              <Input
                id="vimeo_embed_code"
                name="vimeo_embed_code"
                type="url"
                placeholder="https://vimeo.com/1157210295/97e706f7d0 or just 123456789"
                defaultValue={lessonData.vimeo_embed_code || ""}
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the full Vimeo URL or just the video ID
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="html_content">Lesson Content</Label>
              <Textarea
                id="html_content"
                name="html_content"
                rows={10}
                placeholder="Write your lesson content here. You can use HTML formatting."
                className="font-mono text-sm"
                defaultValue={lessonData.html_content || ""}
              />
              <p className="mt-1 text-xs text-gray-500">
                HTML content that will be displayed below the video
              </p>
            </div>

            {/* Existing Files Section */}
            {lessonData.files && lessonData.files.length > 0 && (
              <div className="sm:col-span-2">
                <Label>Existing Files</Label>
                <div className="mt-2 space-y-2">
                  {lessonData.files.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-semibold">
                            {file.file_name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.display_name}</p>
                          <p className="text-xs text-gray-500">
                            {file.file_size_bytes ? (file.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown size'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          {new Date(file.created_at).toLocaleDateString()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingFiles.has(file.id)}
                          onClick={() => deleteExistingFile(file.id, file.display_name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingFiles.has(file.id) ? (
                            "Deleting..."
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Files Section */}
            <div className="sm:col-span-2">
              <Label>Add New Files</Label>
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleNewFileSelect}
                    />
                  </label>
                </div>

                {newFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">New files to upload:</p>
                    {newFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                            <span className="text-green-600 text-xs font-semibold">
                              {file.name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNewFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-6">
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewModalOpen(true)}
              >
                <Play className="mr-2 h-4 w-4" />
                Quick Preview
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href={`/admin/courses/${courseId}/modules/${lessonData.module_id}/lessons/${lessonId}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Full Preview
                </Link>
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link href={`/admin/courses/${courseId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Lesson"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      <LessonPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        courseId={courseId}
        moduleId={lessonData?.module_id || ""}
        lessonId={lessonId}
        lessonName={lessonData?.name}
      />
    </div>
  )
}