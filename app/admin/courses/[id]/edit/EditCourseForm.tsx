"use client"

import React, { useState } from "react"
import { updateCourse } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ValidatedInput } from "@/components/ui/ValidatedInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Course } from "@/lib/actions/course.actions"
import type { ValidationState } from "@/lib/hooks/useSlugValidation"

interface EditCourseFormProps {
  courseId: string
  initialData: Course
}

export function EditCourseForm({ courseId, initialData }: EditCourseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    slug: initialData.slug || "",
    description: initialData.description || "",
    thumbnail_url: initialData.thumbnail_url || "",
    is_published: initialData.is_published || false,
    sort_order: initialData.sort_order || 0
  })
  const [isSlugValid, setIsSlugValid] = useState(true)
  const [slugValidationState, setSlugValidationState] = useState<ValidationState>("idle")

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  function handleSlugValidation(isValid: boolean, state: ValidationState) {
    setIsSlugValid(isValid)
    setSlugValidationState(state)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isSlugValid || slugValidationState === "checking") {
      toast.error("Please wait for slug validation to complete or fix validation errors.")
      return
    }

    setIsLoading(true)

    try {
      const updateData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        is_published: formData.is_published,
        sort_order: formData.sort_order,
      }

      await updateCourse(courseId, updateData)
      toast.success("Course updated successfully!")
      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      console.error("Error updating course:", error)
      toast.error("Failed to update course. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Course Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Enter course name"
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
            onChange={(value) => handleInputChange("slug", value)}
            onValidationChange={handleSlugValidation}
            validationOptions={{ type: "course", excludeId: courseId }}
            validateOnBlur={true}
            showValidationIcon={true}
            placeholder="course-slug"
          />
          <p className="mt-1 text-xs text-gray-500">
            URL-friendly identifier (lowercase, hyphens only)
          </p>
        </div>

        <div>
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => handleInputChange("sort_order", parseInt(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lower numbers appear first in the catalog
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Course description and overview"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
          <Input
            id="thumbnail_url"
            name="thumbnail_url"
            type="url"
            value={formData.thumbnail_url}
            onChange={(e) => handleInputChange("thumbnail_url", e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional image URL for course thumbnail
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => handleInputChange("is_published", !!checked)}
            />
            <Label htmlFor="is_published">Published</Label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Published courses are visible to enrolled organizations
          </p>
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
          {isLoading ? "Updating..." : "Update Course"}
        </Button>
      </div>
    </form>
  )
}