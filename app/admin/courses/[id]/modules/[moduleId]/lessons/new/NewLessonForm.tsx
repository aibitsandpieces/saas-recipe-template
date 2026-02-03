"use client"

import React, { useState } from "react"
import { createLessonWithFiles } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ValidatedInput } from "@/components/ui/ValidatedInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateSlug } from "@/lib/utils/slug"
import type { ValidationState } from "@/lib/hooks/useSlugValidation"

interface NewLessonFormProps {
  courseId: string
  moduleId: string
}

export function NewLessonForm({ courseId, moduleId }: NewLessonFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

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

  return (
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
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter lesson name"
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
            onChange={handleSlugChange}
            onValidationChange={handleSlugValidation}
            validationOptions={{ type: "lesson", excludeId: undefined }}
            validateOnBlur={true}
            showValidationIcon={true}
            placeholder="lesson-slug"
          />
          <p className="mt-1 text-xs text-gray-500">
            URL-friendly identifier (auto-generated from name)
          </p>
        </div>

        <div>
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lower numbers appear first in the module
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="html_content">Content</Label>
          <Textarea
            id="html_content"
            name="html_content"
            rows={6}
            value={formData.html_content}
            onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
            placeholder="Lesson content (supports HTML)"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="vimeo_embed_code">Vimeo Embed Code</Label>
          <Textarea
            id="vimeo_embed_code"
            name="vimeo_embed_code"
            rows={3}
            value={formData.vimeo_embed_code}
            onChange={(e) => setFormData(prev => ({ ...prev, vimeo_embed_code: e.target.value }))}
            placeholder="Paste Vimeo embed code here (optional)"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: Embed a Vimeo video in this lesson
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label>Files</Label>
          <label
            htmlFor="file-upload"
            className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <p className="pl-1">
                  Drop files here or click to upload
                </p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, XLS, XLSX files only
              </p>
            </div>
          </label>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />

          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Selected Files ({files.length})
              </h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
  )
}