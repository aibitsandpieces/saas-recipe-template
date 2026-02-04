"use client"

import React, { useState } from "react"
import {
  getCourseEnrollments,
  enrollOrganisation,
  removeEnrollment,
} from "@/lib/actions/course.actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Building } from "lucide-react"
import { toast } from "sonner"

interface Organisation {
  id: string
  name: string
  created_at: string | null
  updated_at: string | null
}

interface CourseEnrollment {
  id: string
  course_id: string
  organisation_id: string
  enrolled_at: string | null
  enrolled_by: string | null
  organisations?: { name: string }
}

interface EnrollmentsManagerProps {
  courseId: string
  organisations: Organisation[]
  initialEnrollments: CourseEnrollment[]
}

export function EnrollmentsManager({
  courseId,
  organisations,
  initialEnrollments
}: EnrollmentsManagerProps) {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>(initialEnrollments)
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleEnrollmentChange(orgId: string, isEnrolled: boolean) {
    setUpdating(orgId)

    try {
      if (isEnrolled) {
        await enrollOrganisation(courseId, orgId)
        toast.success("Organisation enrolled successfully!")
      } else {
        await removeEnrollment(courseId, orgId)
        toast.success("Organisation enrollment removed!")
      }

      // Reload enrollments
      const newEnrollments = await getCourseEnrollments(courseId)
      setEnrollments(newEnrollments)
    } catch (error) {
      console.error("Error updating enrollment:", error)
      toast.error("Failed to update enrollment. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  function isEnrolled(orgId: string): boolean {
    return enrollments.some(e => e.organisation_id === orgId)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Organisation Access</h2>
        </div>
        <div className="text-sm text-gray-500">
          {enrollments.length} of {organisations.length} organisations enrolled
        </div>
      </div>

      {organisations.length === 0 ? (
        <div className="text-center py-8">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No organisations</h3>
          <p className="mt-1 text-sm text-gray-500">
            No organisations found in the system.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {organisations.map((org) => {
            const enrolled = isEnrolled(org.id)
            const isUpdating = updating === org.id

            return (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`org-${org.id}`}
                    checked={enrolled}
                    disabled={isUpdating}
                    onCheckedChange={(checked) =>
                      handleEnrollmentChange(org.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`org-${org.id}`}
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {org.name}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  {enrolled && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Enrolled
                    </span>
                  )}
                  {isUpdating && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {organisations.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              Select organisations to give them access to this course
            </div>
            <div className="text-gray-700">
              <strong>{enrollments.length}</strong> enrolled
            </div>
          </div>
        </div>
      )}
    </>
  )
}