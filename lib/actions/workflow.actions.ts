"use server"

import { requirePlatformAdmin, getCurrentUser } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import {
  WorkflowCategory,
  WorkflowDepartment,
  Workflow,
  WorkflowFile,
  WorkflowSearchFilters,
  WorkflowSearchResult,
  WorkflowCategoryWithDepartments
} from "@/types"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type DbWorkflowCategory = Tables<"workflow_categories">
export type DbWorkflowDepartment = Tables<"workflow_departments">
export type DbWorkflow = Tables<"workflows">
export type DbWorkflowFile = Tables<"workflow_files">
export type DbWorkflowImportLog = Tables<"workflow_import_logs">

// Validation schemas
const WorkflowCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  sort_order: z.number().int().optional()
})

const WorkflowDepartmentSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  sort_order: z.number().int().optional()
})

const WorkflowSchema = z.object({
  department_id: z.string().uuid(),
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  ai_mba: z.string().optional(),
  topic: z.string().optional(),
  source_book: z.string().optional(),
  source_author: z.string().optional(),
  external_url: z.string().url().optional().or(z.literal("")),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().optional()
})

const WorkflowFileSchema = z.object({
  workflow_id: z.string().uuid(),
  file_name: z.string().min(1, "File name is required"),
  display_name: z.string().min(1, "Display name is required"),
  storage_path: z.string().min(1, "Storage path is required"),
  file_size_bytes: z.number().int().optional(),
  content_type: z.string().optional(),
  sort_order: z.number().int().optional()
})

/**
 * Get all workflow categories with department counts
 */
export async function getWorkflowCategories(): Promise<WorkflowCategory[]> {
  const supabase = await createSupabaseClient()

  const { data: categories, error } = await supabase
    .from("workflow_categories")
    .select(`
      *,
      workflow_departments (
        id
      )
    `)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching workflow categories:", error)
    throw new Error("Failed to fetch workflow categories")
  }

  return categories?.map(category => ({
    ...category,
    departmentCount: category.workflow_departments?.length || 0
  })) || []
}

/**
 * Get all workflow categories with full hierarchical data
 */
export async function getWorkflowCategoriesWithDepartments(): Promise<WorkflowCategoryWithDepartments[]> {
  const supabase = await createSupabaseClient()

  const { data: categories, error } = await supabase
    .from("workflow_categories")
    .select(`
      *,
      workflow_departments (
        *,
        workflows (
          id,
          name,
          is_published
        )
      )
    `)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching workflow categories with departments:", error)
    throw new Error("Failed to fetch workflow categories")
  }

  return categories?.map(category => ({
    ...category,
    departmentCount: category.workflow_departments?.length || 0,
    departments: (category.workflow_departments || []).map(dept => ({
      ...dept,
      workflowCount: dept.workflows?.length || 0,
      workflows: dept.workflows || []
    }))
  })) || []
}

/**
 * Get departments by category ID
 */
export async function getWorkflowDepartmentsByCategory(categoryId: string): Promise<WorkflowDepartment[]> {
  const supabase = await createSupabaseClient()

  const { data: departments, error } = await supabase
    .from("workflow_departments")
    .select(`
      *,
      workflow_categories (
        name
      ),
      workflows (
        id
      )
    `)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching workflow departments:", error)
    throw new Error("Failed to fetch workflow departments")
  }

  return departments?.map(dept => ({
    ...dept,
    categoryName: dept.workflow_categories?.name,
    workflowCount: dept.workflows?.length || 0
  })) || []
}

/**
 * Get workflows by department ID
 */
export async function getWorkflowsByDepartment(departmentId: string): Promise<Workflow[]> {
  const supabase = await createSupabaseClient()

  const { data: workflows, error } = await supabase
    .from("workflows")
    .select(`
      *,
      workflow_departments (
        name,
        workflow_categories (
          id,
          name
        )
      ),
      workflow_files (
        id
      )
    `)
    .eq("department_id", departmentId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching workflows:", error)
    throw new Error("Failed to fetch workflows")
  }

  return workflows?.map(workflow => ({
    ...workflow,
    departmentName: workflow.workflow_departments?.name,
    categoryName: workflow.workflow_departments?.workflow_categories?.name,
    categoryId: workflow.workflow_departments?.workflow_categories?.id,
    fileCount: workflow.workflow_files?.length || 0
  })) || []
}

/**
 * Get a single workflow with full details
 */
export async function getWorkflow(id: string): Promise<Workflow | null> {
  const supabase = await createSupabaseClient()

  const { data: workflow, error } = await supabase
    .from("workflows")
    .select(`
      *,
      workflow_departments (
        name,
        category_id,
        workflow_categories (
          id,
          name
        )
      ),
      workflow_files (
        *
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching workflow:", error)

    // Check if it's a legitimate "not found" error
    if (error.code === 'PGRST116') {  // Supabase "no rows" error code
      return null  // Legitimate 404
    }

    // For other errors, throw to surface the problem
    const errorMessage = error.message || error.code || 'Unknown database error'
    throw new Error(`Failed to fetch workflow: ${errorMessage}`)
  }

  if (!workflow) return null

  return {
    ...workflow,
    departmentName: workflow.workflow_departments?.name,
    categoryName: workflow.workflow_departments?.workflow_categories?.name,
    categoryId: workflow.workflow_departments?.workflow_categories?.id,
    files: workflow.workflow_files || [],
    fileCount: workflow.workflow_files?.length || 0
  }
}

/**
 * Search workflows with filters
 */
export async function searchWorkflows(filters: WorkflowSearchFilters): Promise<WorkflowSearchResult> {
  const supabase = await createSupabaseClient()

  let query = supabase
    .from("workflows")
    .select(`
      *,
      workflow_departments (
        name,
        category_id,
        workflow_categories (
          id,
          name
        )
      ),
      workflow_files (
        id
      )
    `)

  // Apply filters
  if (filters.categoryId) {
    query = query.eq("workflow_departments.category_id", filters.categoryId)
  }

  if (filters.departmentId) {
    query = query.eq("department_id", filters.departmentId)
  }

  if (filters.sourceAuthor) {
    query = query.ilike("source_author", `%${filters.sourceAuthor}%`)
  }

  if (filters.sourceBook) {
    query = query.ilike("source_book", `%${filters.sourceBook}%`)
  }

  if (filters.isPublished !== undefined) {
    query = query.eq("is_published", filters.isPublished)
  }

  // Full-text search
  if (filters.query) {
    query = query.textSearch("search_vector", filters.query, {
      type: "websearch",
      config: "english"
    })
  }

  // Order by relevance if searching, otherwise by sort order
  if (filters.query) {
    query = query.order("search_vector", { ascending: false })
  } else {
    query = query.order("sort_order", { ascending: true })
    query = query.order("name", { ascending: true })
  }

  const { data: workflows, error } = await query

  if (error) {
    console.error("Error searching workflows:", error)
    throw new Error("Failed to search workflows")
  }

  // Get categories and departments for filtering UI
  const categoriesPromise = getWorkflowCategories()
  const departmentsPromise = filters.categoryId
    ? getWorkflowDepartmentsByCategory(filters.categoryId)
    : Promise.resolve([])

  const [categories, departments] = await Promise.all([categoriesPromise, departmentsPromise])

  return {
    workflows: workflows?.map(workflow => ({
      ...workflow,
      departmentName: workflow.workflow_departments?.name,
      categoryName: workflow.workflow_departments?.workflow_categories?.name,
      categoryId: workflow.workflow_departments?.workflow_categories?.id,
      fileCount: workflow.workflow_files?.length || 0
    })) || [],
    totalCount: workflows?.length || 0,
    categories,
    departments
  }
}

/**
 * Create a new workflow category (admin only)
 */
export async function createWorkflowCategory(data: z.infer<typeof WorkflowCategorySchema>): Promise<DbWorkflowCategory> {
  await requirePlatformAdmin()

  const validated = WorkflowCategorySchema.parse(data)
  const supabase = await createSupabaseClient()

  const { data: category, error } = await supabase
    .from("workflow_categories")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating workflow category:", error)
    throw new Error("Failed to create workflow category")
  }

  revalidatePath("/admin/workflows")
  return category
}

/**
 * Create a new workflow department (admin only)
 */
export async function createWorkflowDepartment(data: z.infer<typeof WorkflowDepartmentSchema>): Promise<DbWorkflowDepartment> {
  await requirePlatformAdmin()

  const validated = WorkflowDepartmentSchema.parse(data)
  const supabase = await createSupabaseClient()

  const { data: department, error } = await supabase
    .from("workflow_departments")
    .insert([validated])
    .select()
    .single()

  if (error) {
    console.error("Error creating workflow department:", error)
    throw new Error("Failed to create workflow department")
  }

  revalidatePath("/admin/workflows")
  return department
}

/**
 * Create a new workflow (admin only)
 */
export async function createWorkflow(data: z.infer<typeof WorkflowSchema>): Promise<DbWorkflow> {
  const user = await requirePlatformAdmin()

  const validated = WorkflowSchema.parse(data)
  const supabase = await createSupabaseClient()

  const { data: workflow, error } = await supabase
    .from("workflows")
    .insert([{
      ...validated,
      created_by: user.id
    }])
    .select()
    .single()

  if (error) {
    console.error("Error creating workflow:", error)
    throw new Error("Failed to create workflow")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
  return workflow
}

/**
 * Update workflow category (admin only)
 */
export async function updateWorkflowCategory(id: string, data: Partial<z.infer<typeof WorkflowCategorySchema>>): Promise<DbWorkflowCategory> {
  await requirePlatformAdmin()

  const validated = WorkflowCategorySchema.partial().parse(data)
  const supabase = await createSupabaseClient()

  const { data: category, error } = await supabase
    .from("workflow_categories")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating workflow category:", error)
    throw new Error("Failed to update workflow category")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
  return category
}

/**
 * Update workflow department (admin only)
 */
export async function updateWorkflowDepartment(id: string, data: Partial<z.infer<typeof WorkflowDepartmentSchema>>): Promise<DbWorkflowDepartment> {
  await requirePlatformAdmin()

  const validated = WorkflowDepartmentSchema.partial().parse(data)
  const supabase = await createSupabaseClient()

  const { data: department, error } = await supabase
    .from("workflow_departments")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating workflow department:", error)
    throw new Error("Failed to update workflow department")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
  return department
}

/**
 * Update workflow (admin only)
 */
export async function updateWorkflow(id: string, data: Partial<z.infer<typeof WorkflowSchema>>): Promise<DbWorkflow> {
  await requirePlatformAdmin()

  const validated = WorkflowSchema.partial().parse(data)
  const supabase = await createSupabaseClient()

  const { data: workflow, error } = await supabase
    .from("workflows")
    .update(validated)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating workflow:", error)
    throw new Error("Failed to update workflow")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
  return workflow
}

/**
 * Delete workflow category (admin only)
 */
export async function deleteWorkflowCategory(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("workflow_categories")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting workflow category:", error)
    throw new Error("Failed to delete workflow category")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
}

/**
 * Delete workflow department (admin only)
 */
export async function deleteWorkflowDepartment(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("workflow_departments")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting workflow department:", error)
    throw new Error("Failed to delete workflow department")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
}

/**
 * Delete workflow (admin only)
 */
export async function deleteWorkflow(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting workflow:", error)
    throw new Error("Failed to delete workflow")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
}

/**
 * Get workflow files for a workflow
 */
export async function getWorkflowFiles(workflowId: string): Promise<WorkflowFile[]> {
  const supabase = await createSupabaseClient()

  const { data: files, error } = await supabase
    .from("workflow_files")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })

  if (error) {
    console.error("Error fetching workflow files:", error)
    throw new Error("Failed to fetch workflow files")
  }

  return files || []
}

/**
 * Create workflow file record (admin only)
 */
export async function createWorkflowFile(data: z.infer<typeof WorkflowFileSchema>): Promise<DbWorkflowFile> {
  const user = await requirePlatformAdmin()

  const validated = WorkflowFileSchema.parse(data)
  const supabase = await createSupabaseClient()

  const { data: file, error } = await supabase
    .from("workflow_files")
    .insert([{
      ...validated,
      uploaded_by: user.id
    }])
    .select()
    .single()

  if (error) {
    console.error("Error creating workflow file:", error)
    throw new Error("Failed to create workflow file")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
  return file
}

/**
 * Delete workflow file (admin only)
 */
export async function deleteWorkflowFile(id: string): Promise<void> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("workflow_files")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting workflow file:", error)
    throw new Error("Failed to delete workflow file")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")
}

/**
 * Bulk deletion functions for testing/resetting workflow data
 */

/**
 * Delete all workflows in a specific category (admin only)
 */
export async function deleteWorkflowsByCategory(categoryId: string): Promise<{ deletedCount: number }> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // First get count of workflows to delete
  const { data: workflows, error: countError } = await supabase
    .from("workflows")
    .select("id")
    .eq("department_id", categoryId)

  if (countError) {
    console.error("Error counting workflows by category:", countError)
    throw new Error("Failed to count workflows in category")
  }

  // Delete workflows in the category
  const { error } = await supabase
    .from("workflows")
    .delete()
    .in("department_id",
      supabase
        .from("workflow_departments")
        .select("id")
        .eq("category_id", categoryId)
    )

  if (error) {
    console.error("Error deleting workflows by category:", error)
    throw new Error("Failed to delete workflows in category")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")

  return { deletedCount: workflows?.length || 0 }
}

/**
 * Delete all workflows in a specific department (admin only)
 */
export async function deleteWorkflowsByDepartment(departmentId: string): Promise<{ deletedCount: number }> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // First get count of workflows to delete
  const { data: workflows, error: countError } = await supabase
    .from("workflows")
    .select("id")
    .eq("department_id", departmentId)

  if (countError) {
    console.error("Error counting workflows by department:", countError)
    throw new Error("Failed to count workflows in department")
  }

  // Delete workflows in the department
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("department_id", departmentId)

  if (error) {
    console.error("Error deleting workflows by department:", error)
    throw new Error("Failed to delete workflows in department")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")

  return { deletedCount: workflows?.length || 0 }
}

/**
 * Delete ALL workflows (admin only) - for testing/reset purposes
 */
export async function deleteAllWorkflows(): Promise<{ deletedCount: number }> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // First get count of workflows to delete
  const { data: workflows, error: countError } = await supabase
    .from("workflows")
    .select("id")

  if (countError) {
    console.error("Error counting all workflows:", countError)
    throw new Error("Failed to count workflows")
  }

  // Delete all workflows (files will be cascade deleted by foreign key constraints)
  const { error } = await supabase
    .from("workflows")
    .delete()
    .neq("id", "")  // Delete all rows

  if (error) {
    console.error("Error deleting all workflows:", error)
    throw new Error("Failed to delete all workflows")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")

  return { deletedCount: workflows?.length || 0 }
}

/**
 * Complete reset - delete all workflow data (admin only)
 * Useful for fresh CSV imports
 */
export async function resetWorkflowLibrary(): Promise<{
  deletedWorkflows: number
  deletedDepartments: number
  deletedCategories: number
}> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  // Get counts before deletion
  const [workflowsResult, departmentsResult, categoriesResult] = await Promise.all([
    supabase.from("workflows").select("id"),
    supabase.from("workflow_departments").select("id"),
    supabase.from("workflow_categories").select("id")
  ])

  if (workflowsResult.error || departmentsResult.error || categoriesResult.error) {
    throw new Error("Failed to count existing data")
  }

  // Delete in reverse order (workflows -> departments -> categories)
  // Due to foreign key constraints
  const deleteWorkflows = await supabase
    .from("workflows")
    .delete()
    .neq("id", "")

  if (deleteWorkflows.error) {
    throw new Error("Failed to delete workflows")
  }

  const deleteDepartments = await supabase
    .from("workflow_departments")
    .delete()
    .neq("id", "")

  if (deleteDepartments.error) {
    throw new Error("Failed to delete departments")
  }

  const deleteCategories = await supabase
    .from("workflow_categories")
    .delete()
    .neq("id", "")

  if (deleteCategories.error) {
    throw new Error("Failed to delete categories")
  }

  revalidatePath("/admin/workflows")
  revalidatePath("/workflows")

  return {
    deletedWorkflows: workflowsResult.data?.length || 0,
    deletedDepartments: departmentsResult.data?.length || 0,
    deletedCategories: categoriesResult.data?.length || 0
  }
}