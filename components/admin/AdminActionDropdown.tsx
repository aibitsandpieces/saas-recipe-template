"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  Plus,
  AlertTriangle,
  Play
} from "lucide-react"
import Link from "next/link"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog"
import { LessonPreviewModal } from "./LessonPreviewModal"
import { DeleteTarget } from "@/lib/types/deletion"
import {
  deleteCourseEnterprise,
  deleteModuleEnterprise,
  deleteLessonEnterprise
} from "@/lib/actions/deletion.actions"
import { toast } from "sonner"

interface CourseActionsProps {
  type: 'course'
  courseId: string
  courseName: string
  courseSlug: string
  isPublished: boolean
}

interface ModuleActionsProps {
  type: 'module'
  courseId: string
  moduleId: string
  moduleName: string
}

interface LessonActionsProps {
  type: 'lesson'
  courseId: string
  moduleId: string
  lessonId: string
  lessonName: string
}

type AdminActionDropdownProps = CourseActionsProps | ModuleActionsProps | LessonActionsProps

export function AdminActionDropdown(props: AdminActionDropdownProps) {
  const { canDeleteCourses, canDeleteModules, canDeleteLessons } = useUserRole()
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch by only rendering on client
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const closeActionDialog = () => {
    setActionDialogOpen(false)
  }

  const handleDelete = async (confirmationText: string, bypassWarnings: boolean) => {
    setIsDeleting(true)

    try {
      let result

      switch (props.type) {
        case 'course':
          if (!canDeleteCourses) throw new Error("Insufficient permissions")
          result = await deleteCourseEnterprise(props.courseId, confirmationText, bypassWarnings)
          break
        case 'module':
          if (!canDeleteModules) throw new Error("Insufficient permissions")
          result = await deleteModuleEnterprise(props.moduleId, confirmationText)
          break
        case 'lesson':
          if (!canDeleteLessons) throw new Error("Insufficient permissions")
          result = await deleteLessonEnterprise(props.lessonId, confirmationText)
          break
      }

      if (result.success) {
        toast.success(result.message)
        setDeleteDialogOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = () => {
    switch (props.type) {
      case 'course':
        return canDeleteCourses
      case 'module':
        return canDeleteModules
      case 'lesson':
        return canDeleteLessons
      default:
        return false
    }
  }

  const getEntityName = () => {
    switch (props.type) {
      case 'course':
        return props.courseName
      case 'module':
        return props.moduleName
      case 'lesson':
        return props.lessonName
    }
  }

  const getEntityId = () => {
    switch (props.type) {
      case 'course':
        return props.courseId
      case 'module':
        return props.moduleId
      case 'lesson':
        return props.lessonId
    }
  }

  // Render placeholder during SSR to prevent hydration mismatch
  if (!isClient) {
    return (
      <Button variant="outline" size="sm" disabled>
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Loading actions menu</span>
      </Button>
    )
  }

  return (
    <>
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {/* Course Actions */}
            {props.type === 'course' && (
              <>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Manage Course
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Details
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}/enrollments`}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Enrollments
                  </Link>
                </Button>
                {props.isPublished && (
                  <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                    <Link href={`/courses/${props.courseSlug}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Course
                    </Link>
                  </Button>
                )}
                {canDelete() && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start mt-4"
                    onClick={() => {
                      setDeleteDialogOpen(true)
                      closeActionDialog()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Course
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Danger
                    </Badge>
                  </Button>
                )}
              </>
            )}

            {/* Module Actions */}
            {props.type === 'module' && (
              <>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}/modules/${props.moduleId}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Module
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}/modules/${props.moduleId}/lessons/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lesson
                  </Link>
                </Button>
                {canDelete() && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start mt-4"
                    onClick={() => {
                      setDeleteDialogOpen(true)
                      closeActionDialog()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Module
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Danger
                    </Badge>
                  </Button>
                )}
              </>
            )}

            {/* Lesson Actions */}
            {props.type === 'lesson' && (
              <>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link href={`/admin/courses/${props.courseId}/modules/${props.moduleId}/lessons/${props.lessonId}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Lesson
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setPreviewModalOpen(true)
                    closeActionDialog()
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Quick Preview
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild onClick={closeActionDialog}>
                  <Link
                    href={`/admin/courses/${props.courseId}/modules/${props.moduleId}/lessons/${props.lessonId}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Full Preview
                  </Link>
                </Button>
                {canDelete() && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start mt-4"
                    onClick={() => {
                      setDeleteDialogOpen(true)
                      closeActionDialog()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Lesson
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Danger
                    </Badge>
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        target={props.type as DeleteTarget}
        entityId={getEntityId()}
        entityName={getEntityName()}
        isDeleting={isDeleting}
      />

      {/* Lesson Preview Modal */}
      {props.type === 'lesson' && (
        <LessonPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          courseId={props.courseId}
          moduleId={props.moduleId}
          lessonId={props.lessonId}
          lessonName={props.lessonName}
        />
      )}
    </>
  )
}