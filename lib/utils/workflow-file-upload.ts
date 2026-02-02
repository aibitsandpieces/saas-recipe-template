import { createSupabaseClient } from "@/lib/supabase"
import { createWorkflowFile } from "@/lib/actions/workflow.actions"
import { v4 as uuidv4 } from "uuid"

export interface WorkflowFileUploadResult {
  id: string
  fileName: string
  displayName: string
  storagePath: string
  fileSizeBytes: number
  contentType?: string
}

/**
 * Upload files to Supabase storage and create database records for workflows
 */
export async function uploadWorkflowFiles(
  workflowId: string,
  files: File[]
): Promise<WorkflowFileUploadResult[]> {
  const supabase = await createSupabaseClient()
  const uploadResults: WorkflowFileUploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // Generate unique storage path
    const fileExtension = file.name.split('.').pop()
    const fileName = file.name
    const storagePath = `workflows/${workflowId}/${uuidv4()}.${fileExtension}`

    try {
      // Upload to storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('workflows')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error(`Error uploading file ${fileName}:`, uploadError)
        throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`)
      }

      // Create database record using the workflow actions
      const fileRecord = await createWorkflowFile({
        workflow_id: workflowId,
        file_name: fileName,
        display_name: fileName, // Use original name as display name
        storage_path: storagePath,
        file_size_bytes: file.size,
        content_type: file.type,
        sort_order: i
      })

      uploadResults.push({
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        displayName: fileRecord.display_name,
        storagePath: fileRecord.storage_path,
        fileSizeBytes: fileRecord.file_size_bytes || 0,
        contentType: fileRecord.content_type || undefined
      })

    } catch (error) {
      // Clean up any partial uploads
      try {
        await supabase.storage.from('workflows').remove([storagePath])
      } catch (cleanupError) {
        console.error('Error cleaning up failed upload:', cleanupError)
      }
      throw error
    }
  }

  return uploadResults
}

/**
 * Delete workflow files from storage and database
 */
export async function deleteWorkflowFiles(workflowId: string): Promise<void> {
  const supabase = await createSupabaseClient()

  // Get all files for this workflow
  const { data: files, error: fetchError } = await supabase
    .from('workflow_files')
    .select('storage_path')
    .eq('workflow_id', workflowId)

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
    .from('workflows')
    .remove(storagePaths)

  if (storageError) {
    console.error('Error deleting files from storage:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('workflow_files')
    .delete()
    .eq('workflow_id', workflowId)

  if (dbError) {
    console.error('Error deleting file records:', dbError)
  }
}

/**
 * Delete a single workflow file from storage and database
 */
export async function deleteWorkflowFile(fileId: string): Promise<void> {
  const supabase = await createSupabaseClient()

  // Get the file record first
  const { data: file, error: fetchError } = await supabase
    .from('workflow_files')
    .select('storage_path')
    .eq('id', fileId)
    .single()

  if (fetchError || !file) {
    console.error('Error fetching file for deletion:', fetchError)
    return
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('workflows')
    .remove([file.storage_path])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('workflow_files')
    .delete()
    .eq('id', fileId)

  if (dbError) {
    console.error('Error deleting file record:', dbError)
  }
}

/**
 * Get download URL for a workflow file
 */
export async function getWorkflowFileDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase.storage
    .from('workflows')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error) {
    console.error('Error creating download URL:', error)
    return null
  }

  return data?.signedUrl || null
}

/**
 * Get public URL for a workflow file (if bucket is public)
 */
export async function getWorkflowFilePublicUrl(storagePath: string): Promise<string | null> {
  const supabase = await createSupabaseClient()

  const { data } = supabase.storage
    .from('workflows')
    .getPublicUrl(storagePath)

  return data?.publicUrl || null
}

/**
 * Validate file size and type for workflow uploads
 */
export function validateWorkflowFile(file: File): { isValid: boolean; error?: string } {
  // Max file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  // Allowed file types
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB'
    }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not supported. Allowed types: PDF, Word, Excel, PowerPoint, text files, and images'
    }
  }

  return { isValid: true }
}

/**
 * Batch validate multiple files
 */
export function validateWorkflowFiles(files: File[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  files.forEach((file, index) => {
    const validation = validateWorkflowFile(file)
    if (!validation.isValid) {
      errors.push(`File ${index + 1} (${file.name}): ${validation.error}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}