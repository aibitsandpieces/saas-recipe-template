"use server"

import { requirePlatformAdmin } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import {
  validateCourseDeletion,
  validateModuleDeletion,
  validateLessonDeletion
} from "@/lib/validation/deletion-validation"
import { DeletionImpact, DeletionSeverity } from "@/lib/types/deletion"
import { revalidatePath } from "next/cache"

export interface DeletionResult {
  success: boolean
  message: string
  auditLogId?: string
  error?: string
}

interface AuditLogEntry {
  action: 'delete_course' | 'delete_module' | 'delete_lesson'
  entity_id: string
  entity_name: string
  user_id: string
  impact: DeletionImpact
  status: 'initiated' | 'completed' | 'failed' | 'rolled_back'
  metadata?: any
}

/**
 * Create audit log entry for deletion action
 */
async function createAuditLog(entry: AuditLogEntry): Promise<string> {
  const supabase = await createSupabaseClient()

  const { data: audit, error } = await supabase
    .from("deletion_audit_log")
    .insert({
      action: entry.action,
      entity_id: entry.entity_id,
      entity_name: entry.entity_name,
      user_id: entry.user_id,
      impact: JSON.stringify(entry.impact),
      status: entry.status,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      created_at: new Date().toISOString()
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating audit log:", error)
    throw new Error("Failed to create audit log")
  }

  return audit.id
}

/**
 * Update audit log entry status
 */
async function updateAuditLog(auditId: string, status: AuditLogEntry['status'], error?: string): Promise<void> {
  const supabase = await createSupabaseClient()

  await supabase
    .from("deletion_audit_log")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: error || null
    })
    .eq("id", auditId)
}

/**
 * Enterprise course deletion with full validation and audit trail
 */
export async function deleteCourseEnterprise(
  courseId: string,
  confirmationText: string,
  bypassWarnings: boolean = false
): Promise<DeletionResult> {
  const user = await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  try {
    // Step 1: Get course info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("name")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      return { success: false, message: "Course not found" }
    }

    // Step 2: Validate confirmation
    if (confirmationText !== course.name) {
      return { success: false, message: "Course name confirmation does not match" }
    }

    // Step 3: Validate business rules
    const impact = await validateCourseDeletion(courseId)

    if (!impact.canDelete) {
      return {
        success: false,
        message: `Cannot delete course: ${impact.blockers.join(", ")}`
      }
    }

    if (impact.severity === DeletionSeverity.DANGEROUS && !bypassWarnings) {
      return {
        success: false,
        message: `Course has active users or enrollments. Use bypass option if deletion is still required.`
      }
    }

    // Step 4: Create audit log
    const auditLogId = await createAuditLog({
      action: 'delete_course',
      entity_id: courseId,
      entity_name: course.name,
      user_id: user.id,
      impact,
      status: 'initiated'
    })

    // Step 5: Begin transaction-based deletion
    try {
      // Get all modules in the course
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId)

      const moduleIds = modules?.map(m => m.id) || []

      if (moduleIds.length > 0) {
        // Get all lessons in these modules
        const { data: lessons } = await supabase
          .from("course_lessons")
          .select("id, course_lesson_files (id, storage_path)")
          .in("module_id", moduleIds)

        // Delete files from storage and database
        if (lessons) {
          for (const lesson of lessons) {
            if (lesson.course_lesson_files && lesson.course_lesson_files.length > 0) {
              // Delete files from storage
              const storagePaths = lesson.course_lesson_files.map(f => f.storage_path)
              await supabase.storage.from('courses').remove(storagePaths)

              // Delete file records
              await supabase
                .from("course_lesson_files")
                .delete()
                .eq("lesson_id", lesson.id)
            }

            // Delete user progress
            await supabase
              .from("course_user_progress")
              .delete()
              .eq("lesson_id", lesson.id)
          }
        }

        // Delete lessons
        await supabase
          .from("course_lessons")
          .delete()
          .in("module_id", moduleIds)

        // Delete modules
        await supabase
          .from("course_modules")
          .delete()
          .eq("course_id", courseId)
      }

      // Delete enrollments
      await supabase
        .from("course_org_enrollments")
        .delete()
        .eq("course_id", courseId)

      // Delete the course
      const { error: deleteCourseError } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId)

      if (deleteCourseError) throw deleteCourseError

      // Update audit log
      await updateAuditLog(auditLogId, 'completed')

      // Revalidate cache
      revalidatePath("/admin/courses")

      return {
        success: true,
        message: `Course "${course.name}" deleted successfully`,
        auditLogId
      }

    } catch (deletionError) {
      console.error("Error during course deletion:", deletionError)
      await updateAuditLog(auditLogId, 'failed', deletionError instanceof Error ? deletionError.message : 'Unknown error')

      return {
        success: false,
        message: "Failed to delete course. Some data may have been partially removed.",
        error: deletionError instanceof Error ? deletionError.message : 'Unknown error'
      }
    }

  } catch (error) {
    console.error("Error in deleteCourseEnterprise:", error)
    return {
      success: false,
      message: "Failed to delete course",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Enterprise module deletion with validation and audit trail
 */
export async function deleteModuleEnterprise(
  moduleId: string,
  confirmationText: string
): Promise<DeletionResult> {
  const user = await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  try {
    // Get module info
    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .select("name, course_id")
      .eq("id", moduleId)
      .single()

    if (moduleError || !module) {
      return { success: false, message: "Module not found" }
    }

    // Validate confirmation
    if (confirmationText !== module.name) {
      return { success: false, message: "Module name confirmation does not match" }
    }

    // Validate business rules
    const impact = await validateModuleDeletion(moduleId)

    if (!impact.canDelete) {
      return {
        success: false,
        message: `Cannot delete module: ${impact.blockers.join(", ")}`
      }
    }

    // Create audit log
    const auditLogId = await createAuditLog({
      action: 'delete_module',
      entity_id: moduleId,
      entity_name: module.name,
      user_id: user.id,
      impact,
      status: 'initiated'
    })

    // Begin deletion
    try {
      // Get lessons in this module
      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, course_lesson_files (id, storage_path)")
        .eq("module_id", moduleId)

      // Delete files and lesson data
      if (lessons) {
        for (const lesson of lessons) {
          if (lesson.course_lesson_files && lesson.course_lesson_files.length > 0) {
            // Delete from storage
            const storagePaths = lesson.course_lesson_files.map(f => f.storage_path)
            await supabase.storage.from('courses').remove(storagePaths)

            // Delete file records
            await supabase
              .from("course_lesson_files")
              .delete()
              .eq("lesson_id", lesson.id)
          }

          // Delete user progress
          await supabase
            .from("course_user_progress")
            .delete()
            .eq("lesson_id", lesson.id)
        }
      }

      // Delete lessons
      await supabase
        .from("course_lessons")
        .delete()
        .eq("module_id", moduleId)

      // Delete the module
      const { error: deleteModuleError } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId)

      if (deleteModuleError) throw deleteModuleError

      // Update audit log
      await updateAuditLog(auditLogId, 'completed')

      // Revalidate cache
      revalidatePath("/admin/courses")
      revalidatePath(`/admin/courses/${module.course_id}`)

      return {
        success: true,
        message: `Module "${module.name}" deleted successfully`,
        auditLogId
      }

    } catch (deletionError) {
      console.error("Error during module deletion:", deletionError)
      await updateAuditLog(auditLogId, 'failed', deletionError instanceof Error ? deletionError.message : 'Unknown error')

      return {
        success: false,
        message: "Failed to delete module",
        error: deletionError instanceof Error ? deletionError.message : 'Unknown error'
      }
    }

  } catch (error) {
    console.error("Error in deleteModuleEnterprise:", error)
    return {
      success: false,
      message: "Failed to delete module",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Enterprise lesson deletion with validation and audit trail
 */
export async function deleteLessonEnterprise(
  lessonId: string,
  confirmationText: string
): Promise<DeletionResult> {
  const user = await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  try {
    // Get lesson info
    const { data: lesson, error: lessonError } = await supabase
      .from("course_lessons")
      .select("name, module_id")
      .eq("id", lessonId)
      .single()

    if (lessonError || !lesson) {
      return { success: false, message: "Lesson not found" }
    }

    // Validate confirmation
    if (confirmationText !== lesson.name) {
      return { success: false, message: "Lesson name confirmation does not match" }
    }

    // Validate business rules
    const impact = await validateLessonDeletion(lessonId)

    if (!impact.canDelete) {
      return {
        success: false,
        message: `Cannot delete lesson: ${impact.blockers.join(", ")}`
      }
    }

    // Create audit log
    const auditLogId = await createAuditLog({
      action: 'delete_lesson',
      entity_id: lessonId,
      entity_name: lesson.name,
      user_id: user.id,
      impact,
      status: 'initiated'
    })

    // Begin deletion
    try {
      // Delete files
      const { data: files } = await supabase
        .from("course_lesson_files")
        .select("storage_path")
        .eq("lesson_id", lessonId)

      if (files && files.length > 0) {
        // Delete from storage
        const storagePaths = files.map(f => f.storage_path)
        await supabase.storage.from('courses').remove(storagePaths)

        // Delete file records
        await supabase
          .from("course_lesson_files")
          .delete()
          .eq("lesson_id", lessonId)
      }

      // Delete user progress
      await supabase
        .from("course_user_progress")
        .delete()
        .eq("lesson_id", lessonId)

      // Delete the lesson
      const { error: deleteLessonError } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId)

      if (deleteLessonError) throw deleteLessonError

      // Update audit log
      await updateAuditLog(auditLogId, 'completed')

      // Get course ID for cache revalidation
      const { data: moduleData } = await supabase
        .from("course_modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .single()

      const courseId = moduleData?.course_id
      revalidatePath("/admin/courses")
      if (courseId) {
        revalidatePath(`/admin/courses/${courseId}`)
      }

      return {
        success: true,
        message: `Lesson "${lesson.name}" deleted successfully`,
        auditLogId
      }

    } catch (deletionError) {
      console.error("Error during lesson deletion:", deletionError)
      await updateAuditLog(auditLogId, 'failed', deletionError instanceof Error ? deletionError.message : 'Unknown error')

      return {
        success: false,
        message: "Failed to delete lesson",
        error: deletionError instanceof Error ? deletionError.message : 'Unknown error'
      }
    }

  } catch (error) {
    console.error("Error in deleteLessonEnterprise:", error)
    return {
      success: false,
      message: "Failed to delete lesson",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}