"use client"

import React, { useState, useEffect } from "react"
import { createLessonWithFiles } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ValidatedInput } from "@/components/ui/ValidatedInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateSlug } from "@/lib/utils/slug"
import type { ValidationState } from "@/lib/hooks/useSlugValidation"

interface NewLessonPageProps {
  params: Promise<{ id: string; moduleId: string }>
}

export default function NewLessonPage({ params }: NewLessonPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [courseId, setCourseId] = useState<string>("")
  const [moduleId, setModuleId] = useState<string>("")
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    html_content: "",
    vimeo_embed_code: "",
    sort_order: 0,
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isSlugValid, setIsSlugValid] = useState(true)
  const [slugValidationState, setSlugValidationState] = useState<ValidationState>("idle")

  // Unwrap params
  useEffect(() => {
    params.then(p => {
      setCourseId(p.id)
      setModuleId(p.moduleId)
    })
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!moduleId) return

    if (!isSlugValid || slugValidationState === "checking") {
      toast.error("Please wait for slug validation to complete or fix validation errors.")
      return
    }

    setIsLoading(true)

    try {
      const data = {
        module_id: moduleId,
        name: formData.name,
        slug: formData.slug,
        html_content: formData.html_content,
        vimeo_embed_code: formData.vimeo_embed_code,
        sort_order: formData.sort_order,
      }

      const lesson = await createLessonWithFiles(data, files)

      if (files.length > 0) {
        toast.success(`Lesson created with ${files.length} file${files.length > 1 ? 's' : ''}!`)
      } else {
        toast.success("Lesson created successfully!")
      }

      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      console.error("Error creating lesson:", error)
      toast.error("Failed to create lesson. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleNameChange(name: string) {
    setFormData(prev => ({ ...prev, name }))

    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited && name) {
      const newSlug = generateSlug(name)
      setFormData(prev => ({ ...prev, slug: newSlug }))
    }
  }

  function handleSlugChange(slug: string) {
    setFormData(prev => ({ ...prev, slug }))
    setSlugManuallyEdited(true)
  }

  function handleSlugValidation(isValid: boolean, state: ValidationState) {
    setIsSlugValid(isValid)
    setSlugValidationState(state)
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
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
      setFiles(prev => [...prev, ...validFiles])
    }

    if (droppedFiles.length > validFiles.length) {
      toast.error('Some files were rejected. Only PDF, DOC, DOCX, XLS, XLSX files are allowed.')
    }
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (!courseId || !moduleId) return <div>Loading...</div>

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
          <h1 className="text-2xl font-bold text-gray-900">Create New Lesson</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new lesson with content and optional video
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Lesson Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                placeholder="Enter lesson name"
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <ValidatedInput
                id="slug"
                name="slug"
                type="text"
                required
                value={formData.slug}
                placeholder="lesson-slug"
                onChange={handleSlugChange}
                onValidationChange={handleSlugValidation}
                validationOptions={{ type: "lesson", moduleId }}
                validateOnBlur={true}
                showValidationIcon={true}
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
                value={formData.sort_order}
                placeholder="0"
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sort_order: parseInt(e.target.value) || 0
                }))}
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
                value={formData.vimeo_embed_code}
                placeholder="https://vimeo.com/1157210295/97e706f7d0 or just 123456789"
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vimeo_embed_code: e.target.value
                }))}
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
                value={formData.html_content}
                placeholder="Write your lesson content here. You can use HTML formatting."
                className="font-mono text-sm"
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  html_content: e.target.value
                }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                HTML content that will be displayed below the video
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label>Lesson Files</Label>
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
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-semibold">
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
                          onClick={() => removeFile(index)}
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

          <div className="flex items-center justify-end space-x-4 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={`/admin/courses/${courseId}`}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isSlugValid || slugValidationState === "checking"}
            >
              {isLoading ? "Creating..." : "Create Lesson"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}