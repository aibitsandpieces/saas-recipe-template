import React from "react"
import { getCourse } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EditCourseForm } from "./EditCourseForm"
import { notFound } from "next/navigation"

interface EditCoursePageProps {
  params: Promise<{ id: string }>
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params

  // Fetch course data on server
  let course
  try {
    course = await getCourse(id)
    if (!course) {
      notFound()
    }
  } catch (error) {
    console.error("Error loading course:", error)
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update course information and settings
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <EditCourseForm courseId={id} initialData={course} />
      </div>
    </div>
  )
}