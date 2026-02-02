"use server"

import { requireUserWithOrg } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { Tables } from "@/types/supabase"
import { revalidatePath } from "next/cache"

export type Course = Tables<"courses">
export type CourseModule = Tables<"course_modules">
export type CourseLesson = Tables<"course_lessons">
export type CourseLessonFile = Tables<"course_lesson_files">
export type CourseUserProgress = Tables<"course_user_progress">

export interface EnrolledCourse extends Course {
  progress?: {
    total_lessons: number
    completed_lessons: number
    percentage: number
  }
}

export interface CourseWithContent extends Course {
  modules: (CourseModule & {
    lessons: (CourseLesson & {
      files: CourseLessonFile[]
      user_progress?: CourseUserProgress
    })[]
  })[]
}

/**
 * Get courses that the user's organisation is enrolled in
 */
export async function getEnrolledCourses(): Promise<EnrolledCourse[]> {
  const { user, organisationId } = await requireUserWithOrg()

  const supabase = await createSupabaseClient()

  // Get enrolled courses through RLS policies
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching enrolled courses:", error)
    throw new Error("Failed to fetch courses")
  }

  if (!courses) return []

  // Calculate progress for each course
  const coursesWithProgress: EnrolledCourse[] = []

  for (const course of courses) {
    // Get total lessons in the course
    const { data: lessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("id, module_id, course_modules!inner(course_id)")
      .eq("course_modules.course_id", course.id)

    if (lessonsError) {
      console.error("Error fetching lessons for course:", course.id, lessonsError)
      continue
    }

    const totalLessons = lessons?.length || 0

    // Get user's completed lessons for this course
    const { data: progress, error: progressError } = await supabase
      .from("course_user_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .in("lesson_id", lessons?.map(l => l.id) || [])

    if (progressError) {
      console.error("Error fetching progress for course:", course.id, progressError)
    }

    const completedLessons = progress?.length || 0
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    coursesWithProgress.push({
      ...course,
      progress: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        percentage
      }
    })
  }

  return coursesWithProgress
}

/**
 * Get a specific course with all content and user progress
 */
export async function getEnrolledCourse(slug: string): Promise<CourseWithContent | null> {
  const { user, organisationId } = await requireUserWithOrg()

  const supabase = await createSupabaseClient()

  // Get course with modules and lessons (RLS will filter enrolled courses)
  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
      course_modules (
        *,
        course_lessons (
          *,
          course_lesson_files (*)
        )
      )
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (error || !course) {
    console.error("Error fetching course:", error)
    return null
  }

  // Get user progress for all lessons in this course
  const lessonIds: string[] = []
  course.course_modules.forEach((module: any) => {
    module.course_lessons.forEach((lesson: any) => {
      lessonIds.push(lesson.id)
    })
  })

  const { data: progressData, error: progressError } = await supabase
    .from("course_user_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds)

  if (progressError) {
    console.error("Error fetching user progress:", progressError)
  }

  const progressMap = new Map<string, CourseUserProgress>()
  progressData?.forEach(p => progressMap.set(p.lesson_id, p))

  // Attach progress to lessons
  const modules = course.course_modules
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((module: any) => ({
      ...module,
      lessons: module.course_lessons
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((lesson: any) => ({
          ...lesson,
          files: lesson.course_lesson_files.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
          user_progress: progressMap.get(lesson.id)
        }))
    }))

  return {
    ...course,
    modules
  } as CourseWithContent
}

/**
 * Get a specific lesson with user progress
 */
export async function getEnrolledLesson(courseSlug: string, lessonSlug: string): Promise<{
  course: Course
  lesson: CourseLesson & {
    files: CourseLessonFile[]
    user_progress?: CourseUserProgress
    module: CourseModule
  }
} | null> {
  const { user, organisationId } = await requireUserWithOrg()

  const supabase = await createSupabaseClient()

  // Get lesson with course and module info
  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .select(`
      *,
      course_lesson_files (*),
      course_modules (
        *,
        courses (*)
      )
    `)
    .eq("slug", lessonSlug)
    .single()

  if (error || !lesson) {
    console.error("Error fetching lesson:", error)
    return null
  }

  // Verify course slug matches and is enrolled
  const course = lesson.course_modules.courses
  if (course.slug !== courseSlug || !course.is_published) {
    return null
  }

  // Get user progress for this lesson
  const { data: progress, error: progressError } = await supabase
    .from("course_user_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle()

  if (progressError) {
    console.error("Error fetching lesson progress:", progressError)
  }

  // Update last accessed time
  await supabase
    .from("course_user_progress")
    .upsert({
      user_id: user.id,
      lesson_id: lesson.id,
      last_accessed_at: new Date().toISOString(),
      completed_at: progress?.completed_at || null
    })

  return {
    course,
    lesson: {
      ...lesson,
      files: lesson.course_lesson_files.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
      user_progress: progress,
      module: lesson.course_modules
    }
  }
}

/**
 * Mark a lesson as completed
 */
export async function completeLesson(lessonId: string): Promise<void> {
  const { user } = await requireUserWithOrg()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("course_user_progress")
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,lesson_id'
    })

  if (error) {
    console.error("Error marking lesson complete:", error)
    throw new Error("Failed to mark lesson as complete")
  }

  revalidatePath("/courses")
}

/**
 * Mark a lesson as incomplete
 */
export async function uncompleteLesson(lessonId: string): Promise<void> {
  const { user } = await requireUserWithOrg()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("course_user_progress")
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed_at: null,
      last_accessed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,lesson_id'
    })

  if (error) {
    console.error("Error marking lesson incomplete:", error)
    throw new Error("Failed to mark lesson as incomplete")
  }

  revalidatePath("/courses")
}