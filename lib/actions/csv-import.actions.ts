"use server"

import { requirePlatformAdmin } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import { Tables, TablesInsert } from "@/types/supabase"
import {
  CSVWorkflowRow,
  ImportError,
  ImportPreviewResult,
  WorkflowImportLog
} from "@/types"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type DbWorkflowImportLog = Tables<"workflow_import_logs">

// CSV Row validation schema
const CSVRowSchema = z.object({
  ai_mba: z.string().min(1, "AI MBA field is required"),
  category: z.string().min(1, "Category field is required"),
  topic: z.string().min(1, "Topic field is required"),
  workflow: z.string().optional(),
  course: z.string().optional(),
  author: z.string().optional(),
  link: z.string().url().optional().or(z.literal(""))
})

/**
 * Validate and preview CSV data before import
 * This function does NOT make any database changes
 */
export async function previewCSVImport(csvData: CSVWorkflowRow[]): Promise<ImportPreviewResult> {
  await requirePlatformAdmin()

  const errors: ImportError[] = []
  const validRows: CSVWorkflowRow[] = []
  const categoriesToCreate: string[] = []
  const departmentsToCreate: string[] = []

  // Get existing categories and departments to avoid duplicates
  const supabase = await createSupabaseClient()

  const [{ data: existingCategories }, { data: existingDepartments }] = await Promise.all([
    supabase.from("workflow_categories").select("name"),
    supabase.from("workflow_departments").select("name, category_id, workflow_categories(name)")
  ])

  const existingCategoryNames = new Set(existingCategories?.map(c => c.name.toLowerCase()) || [])
  const existingDepartmentMap = new Map()

  existingDepartments?.forEach(dept => {
    const categoryName = dept.workflow_categories?.name?.toLowerCase()
    if (categoryName && dept.name) {
      existingDepartmentMap.set(`${categoryName}:${dept.name.toLowerCase()}`, true)
    }
  })

  const newCategoriesSet = new Set<string>()
  const newDepartmentsSet = new Set<string>()

  // Validate each row
  csvData.forEach((row, index) => {
    const rowNumber = index + 1

    try {
      // Validate required fields
      const validatedRow = CSVRowSchema.parse(row)

      // Check for category creation needs
      const categoryName = validatedRow.ai_mba.trim()
      const departmentName = validatedRow.category.trim()
      const workflowName = validatedRow.topic.trim()

      if (!categoryName) {
        errors.push({
          row: rowNumber,
          field: "ai_mba",
          message: "Category name cannot be empty",
          value: row.ai_mba
        })
        return
      }

      if (!departmentName) {
        errors.push({
          row: rowNumber,
          field: "category",
          message: "Department name cannot be empty",
          value: row.category
        })
        return
      }

      if (!workflowName) {
        errors.push({
          row: rowNumber,
          field: "topic",
          message: "Workflow name cannot be empty",
          value: row.topic
        })
        return
      }

      // Track categories to create
      const categoryKey = categoryName.toLowerCase()
      if (!existingCategoryNames.has(categoryKey) && !newCategoriesSet.has(categoryKey)) {
        newCategoriesSet.add(categoryKey)
        categoriesToCreate.push(categoryName)
      }

      // Track departments to create
      const departmentKey = `${categoryKey}:${departmentName.toLowerCase()}`
      if (!existingDepartmentMap.has(departmentKey) && !newDepartmentsSet.has(departmentKey)) {
        newDepartmentsSet.add(departmentKey)
        departmentsToCreate.push(`${categoryName} → ${departmentName}`)
      }

      // Validate external URL if provided
      if (validatedRow.link && validatedRow.link.trim()) {
        try {
          new URL(validatedRow.link)
        } catch {
          errors.push({
            row: rowNumber,
            field: "link",
            message: "Invalid URL format",
            value: row.link
          })
          return
        }
      }

      validRows.push(validatedRow)

    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        validationError.errors.forEach(err => {
          errors.push({
            row: rowNumber,
            field: err.path[0] as string,
            message: err.message,
            value: row[err.path[0] as keyof CSVWorkflowRow]
          })
        })
      } else {
        errors.push({
          row: rowNumber,
          message: "Unknown validation error",
          value: row
        })
      }
    }
  })

  // Get sample data (first 10 valid rows)
  const sampleData = validRows.slice(0, 10)

  return {
    isValid: errors.length === 0,
    totalRows: csvData.length,
    validRows: validRows.length,
    errors,
    summary: {
      categoriesToCreate,
      departmentsToCreate,
      workflowsToCreate: validRows.length,
      existingCategories: Array.from(existingCategoryNames),
      existingDepartments: Array.from(existingDepartmentMap.keys())
    },
    sampleData
  }
}

/**
 * Execute CSV import with transaction safety (all or nothing)
 */
export async function executeCSVImport(
  csvData: CSVWorkflowRow[],
  fileName: string
): Promise<WorkflowImportLog> {
  const user = await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  // First, validate the data
  const preview = await previewCSVImport(csvData)

  if (!preview.isValid) {
    throw new Error(`CSV validation failed: ${preview.errors.length} errors found`)
  }

  // Create import log entry
  const { data: importLog, error: logError } = await supabase
    .from("workflow_import_logs")
    .insert({
      file_name: fileName,
      total_rows: csvData.length,
      successful_rows: 0,
      failed_rows: 0,
      imported_by: user.id
    })
    .select()
    .single()

  if (logError || !importLog) {
    console.error("Error creating import log:", logError)
    throw new Error("Failed to create import log")
  }

  try {
    // Execute import in a transaction
    const result = await executeImportTransaction(csvData, importLog.id, user.id)

    // Update import log with success
    await supabase
      .from("workflow_import_logs")
      .update({
        successful_rows: result.successfulRows,
        failed_rows: result.failedRows,
        categories_created: result.categoriesCreated,
        departments_created: result.departmentsCreated,
        workflows_created: result.workflowsCreated,
        completed_at: new Date().toISOString(),
        error_summary: result.errors.length > 0 ? result.errors : null
      })
      .eq("id", importLog.id)

    // Revalidate pages
    revalidatePath("/admin/workflows")
    revalidatePath("/workflows")

    return {
      ...importLog,
      successful_rows: result.successfulRows,
      failed_rows: result.failedRows,
      categories_created: result.categoriesCreated,
      departments_created: result.departmentsCreated,
      workflows_created: result.workflowsCreated,
      completed_at: new Date().toISOString(),
      status: result.errors.length > 0 ? "completed" : "completed"
    }

  } catch (error) {
    console.error("CSV import transaction failed:", error)

    // Update import log with failure
    await supabase
      .from("workflow_import_logs")
      .update({
        failed_rows: csvData.length,
        error_summary: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "transaction_failure"
        },
        completed_at: new Date().toISOString()
      })
      .eq("id", importLog.id)

    throw error
  }
}

/**
 * Internal function to execute the import transaction
 * This ensures atomicity - either all data is imported or nothing is
 */
async function executeImportTransaction(
  csvData: CSVWorkflowRow[],
  importLogId: string,
  userId: string
) {
  const supabase = await createSupabaseClient()

  let categoriesCreated = 0
  let departmentsCreated = 0
  let workflowsCreated = 0
  let successfulRows = 0
  let failedRows = 0
  const errors: ImportError[] = []

  // Create maps to store created categories and departments
  const categoryMap = new Map<string, string>() // name -> id
  const departmentMap = new Map<string, string>() // category:name -> id

  try {
    // Step 1: Get existing categories and departments
    const [{ data: existingCategories }, { data: existingDepartments }] = await Promise.all([
      supabase.from("workflow_categories").select("id, name"),
      supabase.from("workflow_departments").select("id, name, category_id, workflow_categories(id, name)")
    ])

    // Populate existing categories map
    existingCategories?.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

    // Populate existing departments map
    existingDepartments?.forEach(dept => {
      const categoryName = dept.workflow_categories?.name?.toLowerCase()
      if (categoryName && dept.name) {
        departmentMap.set(`${categoryName}:${dept.name.toLowerCase()}`, dept.id)
      }
    })

    // Step 2: Collect unique categories and departments to create
    const categoriesToCreate = new Set<string>()
    const departmentsToCreate = new Set<string>()

    csvData.forEach(row => {
      const categoryName = row.ai_mba.trim()
      const departmentName = row.category.trim()
      const categoryKey = categoryName.toLowerCase()
      const departmentKey = `${categoryKey}:${departmentName.toLowerCase()}`

      if (!categoryMap.has(categoryKey)) {
        categoriesToCreate.add(categoryName)
      }

      if (!departmentMap.has(departmentKey)) {
        departmentsToCreate.add(`${categoryName}|||${departmentName}`) // Use delimiter to split later
      }
    })

    // Step 3: Create categories in batch
    if (categoriesToCreate.size > 0) {
      const categoryInserts = Array.from(categoriesToCreate).map((name, index) => ({
        name,
        sort_order: (existingCategories?.length || 0) + index + 1
      }))

      const { data: newCategories, error: categoriesError } = await supabase
        .from("workflow_categories")
        .insert(categoryInserts)
        .select()

      if (categoriesError) {
        throw new Error(`Failed to create categories: ${categoriesError.message}`)
      }

      // Update category map with new categories
      newCategories?.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat.id)
      })

      categoriesCreated = newCategories?.length || 0
    }

    // Step 4: Create departments in batch
    if (departmentsToCreate.size > 0) {
      const departmentInserts = Array.from(departmentsToCreate).map((nameCombo, index) => {
        const [categoryName, departmentName] = nameCombo.split("|||")
        const categoryId = categoryMap.get(categoryName.toLowerCase())

        if (!categoryId) {
          throw new Error(`Category ID not found for department: ${departmentName}`)
        }

        return {
          category_id: categoryId,
          name: departmentName,
          sort_order: index + 1
        }
      })

      const { data: newDepartments, error: departmentsError } = await supabase
        .from("workflow_departments")
        .insert(departmentInserts)
        .select()

      if (departmentsError) {
        throw new Error(`Failed to create departments: ${departmentsError.message}`)
      }

      // Update department map with new departments
      newDepartments?.forEach(dept => {
        // Find the category for this department
        const category = Array.from(categoryMap.entries())
          .find(([_, id]) => id === dept.category_id)

        if (category) {
          const [categoryName] = category
          departmentMap.set(`${categoryName}:${dept.name.toLowerCase()}`, dept.id)
        }
      })

      departmentsCreated = newDepartments?.length || 0
    }

    // Step 5: Create workflows in batch
    const workflowInserts = csvData.map((row, index) => {
      const categoryName = row.ai_mba.trim().toLowerCase()
      const departmentName = row.category.trim().toLowerCase()
      const departmentKey = `${categoryName}:${departmentName}`
      const departmentId = departmentMap.get(departmentKey)

      if (!departmentId) {
        throw new Error(`Department ID not found for: ${row.category} in ${row.ai_mba}`)
      }

      return {
        department_id: departmentId,
        name: row.topic.trim(),
        description: row.workflow?.trim() || null,
        ai_mba: row.ai_mba.trim(),
        topic: row.topic.trim(),
        source_book: row.course?.trim() || null,
        source_author: row.author?.trim() || null,
        external_url: row.link?.trim() || null,
        is_published: true, // Auto-publish imported workflows
        sort_order: index + 1,
        created_by: userId
      }
    })

    const { data: newWorkflows, error: workflowsError } = await supabase
      .from("workflows")
      .insert(workflowInserts)
      .select()

    if (workflowsError) {
      throw new Error(`Failed to create workflows: ${workflowsError.message}`)
    }

    workflowsCreated = newWorkflows?.length || 0
    successfulRows = csvData.length

    return {
      categoriesCreated,
      departmentsCreated,
      workflowsCreated,
      successfulRows,
      failedRows,
      errors
    }

  } catch (error) {
    console.error("Transaction error:", error)
    throw error
  }
}

/**
 * Get import logs for admin dashboard
 */
export async function getImportLogs(): Promise<WorkflowImportLog[]> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: logs, error } = await supabase
    .from("workflow_import_logs")
    .select(`
      *,
      users (
        name,
        email
      )
    `)
    .order("started_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching import logs:", error)
    throw new Error("Failed to fetch import logs")
  }

  return logs?.map(log => ({
    ...log,
    importerName: log.users?.name || log.users?.email || "Unknown",
    duration: log.completed_at && log.started_at
      ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
      : undefined,
    status: log.completed_at
      ? (log.failed_rows > 0 ? "failed" : "completed")
      : "pending"
  })) || []
}

/**
 * Get a single import log by ID
 */
export async function getImportLog(id: string): Promise<WorkflowImportLog | null> {
  await requirePlatformAdmin()

  const supabase = await createSupabaseClient()

  const { data: log, error } = await supabase
    .from("workflow_import_logs")
    .select(`
      *,
      users (
        name,
        email
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching import log:", error)
    return null
  }

  if (!log) return null

  return {
    ...log,
    importerName: log.users?.name || log.users?.email || "Unknown",
    duration: log.completed_at && log.started_at
      ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
      : undefined,
    status: log.completed_at
      ? (log.failed_rows > 0 ? "failed" : "completed")
      : "pending"
  }
}