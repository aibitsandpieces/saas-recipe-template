"use client"

import React, { useState, useEffect } from "react"
import { getCourse, updateCourse } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ValidatedInput } from "@/components/ui/ValidatedInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Course } from "@/lib/actions/course.actions"
import type { ValidationState } from "@/lib/hooks/useSlugValidation"

interface EditCoursePageProps {
  params: Promise<{ id: string }>
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [courseId, setCourseId] = useState<string>("")
  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnail_url: "",
    is_published: false,
    sort_order: 0
  })
  const [isSlugValid, setIsSlugValid] = useState(true)
  const [slugValidationState, setSlugValidationState] = useState<ValidationState>("idle")

  // Unwrap params and load course data
  useEffect(() => {
    params.then(async (p) => {
      setCourseId(p.id)

      try {
        const courseData = await getCourse(p.id)
        if (courseData) {
          setCourse(courseData)
          setFormData({
            name: courseData.name || "",
            slug: courseData.slug || "",
            description: courseData.description || "",
            thumbnail_url: courseData.thumbnail_url || "",
            is_published: courseData.is_published || false,
            sort_order: courseData.sort_order || 0
          })
        }
      } catch (error) {
        console.error("Error loading course:", error)
        toast.error("Failed to load course data")
      }
    })
  }, [params])

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
    if (!courseId) return

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

  if (!courseId || !course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update course information and settings
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
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
      </div>
    </div>
  )
}