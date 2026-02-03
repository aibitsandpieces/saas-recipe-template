import React from "react"
import { getModule } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EditModuleForm } from "./EditModuleForm"
import { notFound } from "next/navigation"

interface EditModulePageProps {
  params: Promise<{ id: string; moduleId: string }>
}

export default async function EditModulePage({ params }: EditModulePageProps) {
  const { id, moduleId } = await params

  // Fetch module data on server
  let module
  try {
    module = await getModule(moduleId)
    if (!module) {
      notFound()
    }
  } catch (error) {
    console.error("Error loading module:", error)
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/courses/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Module</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update module information
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <EditModuleForm
          courseId={id}
          moduleId={moduleId}
          initialData={module}
        />
      </div>
    </div>
  )
}