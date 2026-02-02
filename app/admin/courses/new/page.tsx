"use client"

import { createCourse } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ValidatedInput } from "@/components/ui/ValidatedInput"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { generateSlug } from "@/lib/utils/slug"
import type { ValidationState } from "@/lib/hooks/useSlugValidation"

export default function NewCoursePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnail_url: "",
    is_published: false,
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
      const course = await createCourse(formData)
      toast.success("Course created successfully!")
      router.push(`/admin/courses/${course.id}`)
    } catch (error) {
      console.error("Error creating course:", error)
      toast.error("Failed to create course. Please try again.")
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new course to your catalog
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
                placeholder="Enter course name"
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
                placeholder="course-slug"
                onChange={handleSlugChange}
                onValidationChange={handleSlugValidation}
                validationOptions={{ type: "course" }}
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
                Lower numbers appear first in lists
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                placeholder="Brief description of the course"
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                name="thumbnail_url"
                type="url"
                value={formData.thumbnail_url}
                placeholder="https://example.com/image.jpg"
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  thumbnail_url: e.target.value
                }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional image URL for the course thumbnail
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    is_published: !!checked
                  }))}
                />
                <Label htmlFor="is_published">Publish immediately</Label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Published courses are visible to enrolled users
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href="/admin/courses">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isSlugValid || slugValidationState === "checking"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}