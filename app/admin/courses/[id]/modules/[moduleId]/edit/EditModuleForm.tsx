"use client"

import React, { useState } from "react"
import { updateModule, CourseModule } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface EditModuleFormProps {
  courseId: string
  moduleId: string
  initialData: CourseModule
}

export function EditModuleForm({ courseId, moduleId, initialData }: EditModuleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData.name ?? "",
    description: initialData.description ?? "",
    sort_order: initialData.sort_order ?? 0
  })

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsLoading(true)

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || undefined,
        sort_order: formData.sort_order
      }

      await updateModule(moduleId, updateData)
      toast.success("Module updated successfully!")
      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      console.error("Error updating module:", error)
      toast.error("Failed to update module. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Module Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Enter module name"
          />
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
            Lower numbers appear first in the course
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Brief description of this module"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-4 border-t pt-6">
        <Button variant="outline" asChild>
          <Link href={`/admin/courses/${courseId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Module"}
        </Button>
      </div>
    </form>
  )
}