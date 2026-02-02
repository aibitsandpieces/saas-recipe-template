"use server"

import { requirePlatformAdmin, requireUserWithOrg } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { uploadLessonFiles, deleteLessonFiles } from "@/lib/utils/file-upload"

export type Course = Tables<"courses">
export type CourseModule = Tables<"course_modules">
export type CourseLesson = Tables<"course_lessons">
export type CourseLessonFile = Tables<"course_lesson_files">
export type CourseOrgEnrollment = Tables<"course_org_enrollments">
export type Organisation = Tables<"organisations">

// Validation schemas
const CourseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().optional()
})

const ModuleSchema = z.object({
  course_id: z.string().uuid(),
  name: z.string().min(1, "Module name is required"),
  description: z.string().optional(),
  sort_order: z.number().int().optional()
})

const LessonSchema = z.object({
  module_id: z.string().uuid(),
  name: z.string().min(1, "Lesson name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  html_content: z.string().optional(),
  vimeo_embed_code: z.string().optional(),
  sort_order: z.number().int().optional()
})

/**
 * Get all courses for admin dashboard
 */
export async function getCourses(): Promise<Course[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching courses:", error)
    throw new Error("Failed to fetch courses")
  }

  return courses || []
}

/**
 * Get a single course with modules and lessons
 */
export async function getCourse(id: string): Promise<Course & {
  modules: (CourseModule & {
    lessons: CourseLesson[]
  })[]
} | null> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
      course_modules (
        *,
        course_lessons (*)
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching course:", error)
    return null
  }

  // Ensure modules and lessons are always arrays
  const modules = (course.course_modules || []).map((module: any) => ({
    ...module,
    lessons: module.course_lessons || []
  }))

  return {
    ...course,
    modules
  } as any
}

/**
 * Create a new course
 */
export async function createCourse(data: z.infer<typeof CourseSchema>): Promise<Course> {
  const user = await requirePlatformAdmin()

  const validated = CourseSchema.parse(data)

  const supabase = await createSupabaseClient()

  const { data: course, error } = await supabase
    .from("courses")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating course:", error)

    // Handle duplicate slug constraint violation
    if (error.code === '23505' && error.message.includes('courses_slug_key')) {
      throw new Error("A course with this name already exists. Please choose a different name.")
    }

    throw new Error("Failed to create course")
  }

  // Auto-enroll AI Potential organization in all new courses
  const { data: aiPotentialOrg } = await supabase
    .from("organisations")
    .select("id")
    .eq("name", "AI Potential")
    .single()

  if (aiPotentialOrg) {
    await supabase
      .from("course_org_enrollments")
      .insert({
        course_id: course.id,
        organisation_id: aiPotentialOrg.id,
        enrolled_by: user.id
      })
  }

  revalidatePath("/admin/courses")
  return course
}

/**
 * Update a course
 */
export async function updateCourse(id: string, data: Partial<z.infer<typeof CourseSchema>>): Promise<Course> {
  await requirePlatformAdmin()

  const validated = CourseSchema.partial().parse(data)

  const supabase = await createSupabaseClient()

  const { data: course, error } = await supabase
    .from("courses")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating course:", error)
    throw new Error("Failed to update course")
  }

  revalidatePath("/admin/courses")
  return course
}

/**
 * Delete a course and all its content
 */
export async function deleteCourse(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting course:", error)
    throw new Error("Failed to delete course")
  }

  revalidatePath("/admin/courses")
}

/**
 * Create a new module in a course
 */
export async function createModule(data: z.infer<typeof ModuleSchema>): Promise<CourseModule> {
  await requirePlatformAdmin()

  const validated = ModuleSchema.parse(data)

  const supabase = await createSupabaseClient()

  const { data: module, error } = await supabase
    .from("course_modules")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating module:", error)

    // Handle duplicate or validation errors with helpful messages
    if (error.code === '23505') {
      throw new Error("A module with this name already exists in this course. Please choose a different name.")
    }

    throw new Error("Failed to create module")
  }

  revalidatePath("/admin/courses")
  return module
}

/**
 * Update a module
 */
export async function updateModule(id: string, data: Partial<z.infer<typeof ModuleSchema>>): Promise<CourseModule> {
  await requirePlatformAdmin()

  const validated = ModuleSchema.partial().parse(data)

  const supabase = await createSupabaseClient()

  const { data: module, error } = await supabase
    .from("course_modules")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating module:", error)
    throw new Error("Failed to update module")
  }

  revalidatePath("/admin/courses")
  return module
}

/**
 * Get a single module by ID
 */
export async function getModule(id: string): Promise<CourseModule | null> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: module, error } = await supabase
    .from("course_modules")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error getting module:", error)
    return null
  }

  return module
}

/**
 * Delete a module and all its lessons
 */
export async function deleteModule(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("course_modules")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting module:", error)
    throw new Error("Failed to delete module")
  }

  revalidatePath("/admin/courses")
}

/**
 * Create a new lesson in a module
 */
export async function createLesson(data: z.infer<typeof LessonSchema>): Promise<CourseLesson> {
  await requirePlatformAdmin()

  const validated = LessonSchema.parse(data)

  const supabase = await createSupabaseClient()

  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating lesson:", error)

    // Handle duplicate slug error
    if (error.code === '23505' && error.message.includes('course_lessons_module_id_slug_key')) {
      throw new Error("A lesson with this slug already exists in this module. Please use a different name.")
    }

    throw new Error("Failed to create lesson")
  }

  revalidatePath("/admin/courses")
  return lesson
}

/**
 * Create a lesson with file uploads
 */
export async function createLessonWithFiles(
  lessonData: z.infer<typeof LessonSchema>,
  files: File[]
): Promise<CourseLesson> {
  await requirePlatformAdmin()

  const validated = LessonSchema.parse(lessonData)

  const supabase = await createSupabaseClient()

  // Create the lesson first
  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating lesson:", error)

    // Handle duplicate slug error
    if (error.code === '23505' && error.message.includes('course_lessons_module_id_slug_key')) {
      throw new Error("A lesson with this slug already exists in this module. Please use a different name.")
    }

    throw new Error("Failed to create lesson")
  }

  // Upload files if provided
  if (files && files.length > 0) {
    try {
      await uploadLessonFiles(lesson.id, files)
    } catch (uploadError) {
      // If file upload fails, clean up the created lesson
      await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lesson.id)

      throw uploadError
    }
  }

  revalidatePath("/admin/courses")
  return lesson
}

/**
 * Get a single lesson with files for editing
 */
/**
 * Get a lesson by slug for students (with enrollment verification)
 */
export async function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  const { user, organisationId } = await requireUserWithOrg()
  const supabase = await createSupabaseClient()

  // First get the course and verify enrollment
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name, slug")
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .single()

  if (courseError || !course) {
    return null
  }

  // Check if user's organization is enrolled in this course
  const { data: enrollment } = await supabase
    .from("course_org_enrollments")
    .select("id")
    .eq("course_id", course.id)
    .eq("organisation_id", organisationId)
    .single()

  if (!enrollment) {
    throw new Error("Your organization is not enrolled in this course")
  }

  // Get the lesson with module info and files
  const { data: lesson, error: lessonError } = await supabase
    .from("course_lessons")
    .select(`
      *,
      course_lesson_files (*),
      course_modules (
        id,
        name,
        course_id
      )
    `)
    .eq("slug", lessonSlug)
    .single()

  if (lessonError || !lesson) {
    return null
  }

  // Verify the lesson belongs to the course
  if (lesson.course_modules?.course_id !== course.id) {
    return null
  }

  return {
    ...lesson,
    files: lesson.course_lesson_files || [],
    module: lesson.course_modules,
    course: {
      id: course.id,
      name: course.name,
      slug: course.slug
    }
  }
}

export async function getLesson(id: string): Promise<CourseLesson & { files: CourseLessonFile[], module?: { id: string, name: string } } | null> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .select(`
      *,
      course_lesson_files (*),
      course_modules (
        id,
        name
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching lesson:", error)
    return null
  }

  return {
    ...lesson,
    files: lesson.course_lesson_files || [],
    module: lesson.course_modules || undefined
  }
}

/**
 * Delete a single file
 */
export async function deleteFile(fileId: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // Get file info first
  const { data: file, error: fetchError } = await supabase
    .from("course_lesson_files")
    .select("storage_path")
    .eq("id", fileId)
    .single()

  if (fetchError || !file) {
    throw new Error("File not found")
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('courses')
    .remove([file.storage_path])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('course_lesson_files')
    .delete()
    .eq('id', fileId)

  if (dbError) {
    throw new Error("Failed to delete file record")
  }

  revalidatePath("/admin/courses")
}

/**
 * Update a lesson with optional new file uploads
 */
export async function updateLessonWithFiles(
  lessonId: string,
  lessonData: Partial<z.infer<typeof LessonSchema>>,
  newFiles: File[]
): Promise<CourseLesson> {
  await requirePlatformAdmin()

  const validated = LessonSchema.partial().parse(lessonData)

  const supabase = await createSupabaseClient()

  // Update the lesson
  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .update(validated)
    .eq("id", lessonId)
    .select()
    .single()

  if (error) {
    console.error("Error updating lesson:", error)
    throw new Error("Failed to update lesson")
  }

  // Upload new files if provided
  if (newFiles && newFiles.length > 0) {
    try {
      await uploadLessonFiles(lessonId, newFiles)
    } catch (uploadError) {
      console.error("Error uploading new files:", uploadError)
      throw uploadError
    }
  }

  revalidatePath("/admin/courses")
  return lesson
}

/**
 * Update a lesson
 */
export async function updateLesson(id: string, data: Partial<z.infer<typeof LessonSchema>>): Promise<CourseLesson> {
  await requirePlatformAdmin()

  const validated = LessonSchema.partial().parse(data)

  const supabase = await createSupabaseClient()

  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating lesson:", error)
    throw new Error("Failed to update lesson")
  }

  revalidatePath("/admin/courses")
  return lesson
}

/**
 * Delete a lesson and all its files
 */
export async function deleteLesson(id: string): Promise<void> {
  await requirePlatformAdmin()

  // First delete associated files from storage and database
  try {
    await deleteLessonFiles(id)
  } catch (error) {
    console.error("Error deleting lesson files:", error)
    // Continue with lesson deletion even if file cleanup fails
  }

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("course_lessons")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting lesson:", error)
    throw new Error("Failed to delete lesson")
  }

  revalidatePath("/admin/courses")
}

/**
 * Get all organisations for enrollment management
 */
export async function getOrganisations(): Promise<Organisation[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: orgs, error } = await supabase
    .from("organisations")
    .select("*")
    .order("name")

  if (error) {
    console.error("Error fetching organisations:", error)
    throw new Error("Failed to fetch organisations")
  }

  return orgs || []
}

/**
 * Get enrolled organisations for a course
 */
export async function getCourseEnrollments(courseId: string): Promise<CourseOrgEnrollment[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: enrollments, error } = await supabase
    .from("course_org_enrollments")
    .select(`
      *,
      organisations (name)
    `)
    .eq("course_id", courseId)

  if (error) {
    console.error("Error fetching course enrollments:", error)
    throw new Error("Failed to fetch course enrollments")
  }

  return enrollments || []
}

/**
 * Enroll an organisation in a course
 */
export async function enrollOrganisation(courseId: string, organisationId: string): Promise<CourseOrgEnrollment> {
  const user = await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: enrollment, error } = await supabase
    .from("course_org_enrollments")
    .insert([{
      course_id: courseId,
      organisation_id: organisationId,
      enrolled_by: user.id
    }])
    .select()
    .single()

  if (error) {
    console.error("Error enrolling organisation:", error)
    throw new Error("Failed to enroll organisation")
  }

  revalidatePath("/admin/courses")
  return enrollment
}

/**
 * Remove organisation enrollment from a course
 */
export async function removeEnrollment(courseId: string, organisationId: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("course_org_enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq("organisation_id", organisationId)

  if (error) {
    console.error("Error removing enrollment:", error)
    throw new Error("Failed to remove enrollment")
  }

  revalidatePath("/admin/courses")
}

/**
 * Track lesson progress - mark lesson as accessed/completed
 */
export async function trackLessonProgress(lessonId: string, completed: boolean = false) {
  const { user } = await requireUserWithOrg()
  const supabase = await createSupabaseClient()

  const progressData = {
    user_id: user.id,
    lesson_id: lessonId,
    last_accessed_at: new Date().toISOString(),
    completed_at: completed ? new Date().toISOString() : null
  }

  // Upsert progress record
  const { data, error } = await supabase
    .from("course_user_progress")
    .upsert(progressData, {
      onConflict: "user_id,lesson_id"
    })
    .select()
    .single()

  if (error) {
    console.error("Error tracking lesson progress:", error)
    return null
  }

  return data
}

