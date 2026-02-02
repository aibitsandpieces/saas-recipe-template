"use server"

import { requirePlatformAdmin } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { DeletionSeverity, DeletionImpact } from "@/lib/types/deletion"

/**
 * Validate course deletion and assess impact
 */
export async function validateCourseDeletion(courseId: string): Promise<DeletionImpact> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const impact: DeletionImpact = {
    canDelete: true,
    severity: DeletionSeverity.SAFE,
    warnings: [],
    blockers: [],
    affectedUsers: 0,
    affectedEnrollments: 0,
    affectedLessons: 0,
    affectedFiles: 0,
    estimatedTime: "< 1 minute",
    requiresApproval: false
  }

  try {
    // Check enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("course_org_enrollments")
      .select("id, organisation_id")
      .eq("course_id", courseId)

    if (enrollmentError) throw enrollmentError

    impact.affectedEnrollments = enrollments?.length || 0

    // Check user progress
    const { data: progressData, error: progressError } = await supabase
      .from("course_user_progress")
      .select("user_id")
      .in("lesson_id",
        await supabase
          .from("course_lessons")
          .select("id")
          .in("module_id",
            await supabase
              .from("course_modules")
              .select("id")
              .eq("course_id", courseId)
              .then(res => res.data?.map(m => m.id) || [])
          )
          .then(res => res.data?.map(l => l.id) || [])
      )

    if (!progressError && progressData) {
      // Count distinct users
      const uniqueUsers = new Set(progressData.map(p => p.user_id))
      impact.affectedUsers = uniqueUsers.size
    }

    // Count lessons and files
    const { data: lessons } = await supabase
      .from("course_lessons")
      .select(`
        id,
        course_lesson_files (id)
      `)
      .in("module_id",
        await supabase
          .from("course_modules")
          .select("id")
          .eq("course_id", courseId)
          .then(res => res.data?.map(m => m.id) || [])
      )

    impact.affectedLessons = lessons?.length || 0
    impact.affectedFiles = lessons?.reduce((total, lesson) =>
      total + (lesson.course_lesson_files?.length || 0), 0) || 0

    // Determine severity and warnings
    if (impact.affectedEnrollments > 0) {
      impact.severity = DeletionSeverity.DANGEROUS
      impact.warnings.push(`${impact.affectedEnrollments} organization(s) are enrolled in this course`)
      impact.requiresApproval = true
    }

    if (impact.affectedUsers > 0) {
      impact.severity = DeletionSeverity.DANGEROUS
      impact.warnings.push(`${impact.affectedUsers} user(s) have progress in this course`)
      impact.requiresApproval = true
    }

    if (impact.affectedLessons > 10) {
      impact.warnings.push(`${impact.affectedLessons} lessons will be permanently deleted`)
      if (impact.severity === DeletionSeverity.SAFE) {
        impact.severity = DeletionSeverity.WARNING
      }
    }

    if (impact.affectedFiles > 0) {
      impact.warnings.push(`${impact.affectedFiles} files will be permanently deleted`)
      if (impact.severity === DeletionSeverity.SAFE) {
        impact.severity = DeletionSeverity.WARNING
      }
    }

    // Estimate deletion time
    if (impact.affectedFiles > 20 || impact.affectedLessons > 50) {
      impact.estimatedTime = "2-5 minutes"
    } else if (impact.affectedFiles > 5 || impact.affectedLessons > 10) {
      impact.estimatedTime = "30 seconds - 2 minutes"
    }

    // Business rule: Cannot delete if course has recent activity
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: recentActivity } = await supabase
      .from("course_user_progress")
      .select("id")
      .gte("last_accessed_at", oneWeekAgo.toISOString())
      .in("lesson_id", lessons?.map(l => l.id) || [])
      .limit(1)

    if (recentActivity && recentActivity.length > 0) {
      impact.canDelete = false
      impact.severity = DeletionSeverity.BLOCKED
      impact.blockers.push("Course has been accessed within the last 7 days. Wait or contact users before deletion.")
    }

    return impact

  } catch (error) {
    console.error("Error validating course deletion:", error)
    return {
      ...impact,
      canDelete: false,
      severity: DeletionSeverity.BLOCKED,
      blockers: ["Unable to validate deletion. Please try again."]
    }
  }
}

/**
 * Validate module deletion and assess impact
 */
export async function validateModuleDeletion(moduleId: string): Promise<DeletionImpact> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const impact: DeletionImpact = {
    canDelete: true,
    severity: DeletionSeverity.SAFE,
    warnings: [],
    blockers: [],
    affectedUsers: 0,
    affectedEnrollments: 0,
    affectedLessons: 0,
    affectedFiles: 0,
    estimatedTime: "< 1 minute",
    requiresApproval: false
  }

  try {
    // Get lessons in this module
    const { data: lessons, error } = await supabase
      .from("course_lessons")
      .select(`
        id,
        course_lesson_files (id)
      `)
      .eq("module_id", moduleId)

    if (error) throw error

    impact.affectedLessons = lessons?.length || 0
    impact.affectedFiles = lessons?.reduce((total, lesson) =>
      total + (lesson.course_lesson_files?.length || 0), 0) || 0

    // Check for user progress
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id)
      const { data: progressData } = await supabase
        .from("course_user_progress")
        .select("user_id")
        .in("lesson_id", lessonIds)

      // Count distinct users
      const uniqueUsers = new Set(progressData?.map(p => p.user_id) || [])
      impact.affectedUsers = uniqueUsers.size
    }

    // Set severity
    if (impact.affectedUsers > 0) {
      impact.severity = DeletionSeverity.WARNING
      impact.warnings.push(`${impact.affectedUsers} user(s) have progress in lessons from this module`)
    }

    if (impact.affectedLessons > 5) {
      impact.warnings.push(`${impact.affectedLessons} lessons will be deleted`)
      if (impact.severity === DeletionSeverity.SAFE) {
        impact.severity = DeletionSeverity.WARNING
      }
    }

    if (impact.affectedFiles > 0) {
      impact.warnings.push(`${impact.affectedFiles} files will be deleted`)
    }

    return impact

  } catch (error) {
    console.error("Error validating module deletion:", error)
    return {
      ...impact,
      canDelete: false,
      severity: DeletionSeverity.BLOCKED,
      blockers: ["Unable to validate deletion. Please try again."]
    }
  }
}

/**
 * Validate lesson deletion and assess impact
 */
export async function validateLessonDeletion(lessonId: string): Promise<DeletionImpact> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const impact: DeletionImpact = {
    canDelete: true,
    severity: DeletionSeverity.SAFE,
    warnings: [],
    blockers: [],
    affectedUsers: 0,
    affectedEnrollments: 0,
    affectedLessons: 1,
    affectedFiles: 0,
    estimatedTime: "< 30 seconds",
    requiresApproval: false
  }

  try {
    // Check files
    const { data: files } = await supabase
      .from("course_lesson_files")
      .select("id")
      .eq("lesson_id", lessonId)

    impact.affectedFiles = files?.length || 0

    // Check user progress
    const { data: progressData } = await supabase
      .from("course_user_progress")
      .select("user_id")
      .eq("lesson_id", lessonId)

    // Count distinct users
    const uniqueUsers = new Set(progressData?.map(p => p.user_id) || [])
    impact.affectedUsers = uniqueUsers.size

    // Set warnings
    if (impact.affectedUsers > 0) {
      impact.severity = DeletionSeverity.WARNING
      impact.warnings.push(`${impact.affectedUsers} user(s) have progress on this lesson`)
    }

    if (impact.affectedFiles > 0) {
      impact.warnings.push(`${impact.affectedFiles} file(s) will be deleted`)
    }

    return impact

  } catch (error) {
    console.error("Error validating lesson deletion:", error)
    return {
      ...impact,
      canDelete: false,
      severity: DeletionSeverity.BLOCKED,
      blockers: ["Unable to validate deletion. Please try again."]
    }
  }
}