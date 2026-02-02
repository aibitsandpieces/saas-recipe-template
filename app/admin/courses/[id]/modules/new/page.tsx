"use client"

import React from "react"
import { createModule } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface NewModulePageProps {
  params: Promise<{ id: string }>
}

export default function NewModulePage({ params }: NewModulePageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [courseId, setCourseId] = useState<string>("")

  // Unwrap params
  React.useEffect(() => {
    params.then(p => setCourseId(p.id))
  }, [params])

  async function onSubmit(formData: FormData) {
    if (!courseId) return

    setIsLoading(true)

    try {
      const data = {
        course_id: courseId,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        sort_order: parseInt(formData.get("sort_order") as string) || 0,
      }

      await createModule(data)
      toast.success("Module created successfully!")
      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      console.error("Error creating module:", error)
      toast.error("Failed to create module. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!courseId) return <div>Loading...</div>

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
          <h1 className="text-2xl font-bold text-gray-900">Create New Module</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new module to organize lessons
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form action={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Module Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Enter module name"
              />
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue="0"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Lower numbers appear first in the course
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Brief description of this module"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={`/admin/courses/${courseId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Module"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}