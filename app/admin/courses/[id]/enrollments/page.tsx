import React from "react"
import {
  getOrganisations,
  getCourseEnrollments,
  getCourse
} from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EnrollmentsManager } from "./EnrollmentsManager"
import { notFound } from "next/navigation"

interface EnrollmentsPageProps {
  params: Promise<{ id: string }>
}

export default async function EnrollmentsPage({ params }: EnrollmentsPageProps) {
  const { id } = await params

  // Fetch all data on server
  let course, organisations, enrollments
  try {
    [course, organisations, enrollments] = await Promise.all([
      getCourse(id),
      getOrganisations(),
      getCourseEnrollments(id)
    ])

    if (!course) {
      notFound()
    }
  } catch (error) {
    console.error("Error loading enrollment data:", error)
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
          <h1 className="text-2xl font-bold text-gray-900">Course Enrollments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage which organisations have access to "{course.name}"
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <EnrollmentsManager
          courseId={id}
          organisations={organisations}
          initialEnrollments={enrollments}
        />
      </div>
    </div>
  )
}