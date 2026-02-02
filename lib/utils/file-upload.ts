import { createSupabaseClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

export interface FileUploadResult {
  id: string
  fileName: string
  displayName: string
  storagePath: string
  fileSizeBytes: number
}

/**
 * Upload files to Supabase storage and create database records
 */
export async function uploadLessonFiles(
  lessonId: string,
  files: File[]
): Promise<FileUploadResult[]> {
  const supabase = await createSupabaseClient()
  const uploadResults: FileUploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // Generate unique storage path
    const fileExtension = file.name.split('.').pop()
    const fileName = file.name
    const storagePath = `lessons/${lessonId}/${uuidv4()}.${fileExtension}`

    try {
      // Upload to storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('courses')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error(`Error uploading file ${fileName}:`, uploadError)
        throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`)
      }

      // Create database record
      const { data: fileRecord, error: dbError } = await supabase
        .from('course_lesson_files')
        .insert({
          lesson_id: lessonId,
          file_name: fileName,
          display_name: fileName, // Use original name as display name
          storage_path: storagePath,
          file_size_bytes: file.size,
          sort_order: i
        })
        .select()
        .single()

      if (dbError) {
        // If database insert fails, clean up uploaded file
        await supabase.storage.from('courses').remove([storagePath])
        console.error(`Error creating file record for ${fileName}:`, dbError)
        throw new Error(`Failed to save file record for ${fileName}: ${dbError.message}`)
      }

      uploadResults.push({
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        displayName: fileRecord.display_name,
        storagePath: fileRecord.storage_path,
        fileSizeBytes: fileRecord.file_size_bytes || 0
      })

    } catch (error) {
      // Clean up any partial uploads
      try {
        await supabase.storage.from('courses').remove([storagePath])
      } catch (cleanupError) {
        console.error('Error cleaning up failed upload:', cleanupError)
      }
      throw error
    }
  }

  return uploadResults
}

/**
 * Delete lesson files from storage and database
 */
export async function deleteLessonFiles(lessonId: string): Promise<void> {
  const supabase = await createSupabaseClient()

  // Get all files for this lesson
  const { data: files, error: fetchError } = await supabase
    .from('course_lesson_files')
    .select('storage_path')
    .eq('lesson_id', lessonId)

  if (fetchError) {
    console.error('Error fetching files for deletion:', fetchError)
    return
  }

  if (!files || files.length === 0) {
    return
  }

  // Delete from storage
  const storagePaths = files.map(f => f.storage_path)
  const { error: storageError } = await supabase.storage
    .from('courses')
    .remove(storagePaths)

  if (storageError) {
    console.error('Error deleting files from storage:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('course_lesson_files')
    .delete()
    .eq('lesson_id', lessonId)

  if (dbError) {
    console.error('Error deleting file records:', dbError)
  }
}