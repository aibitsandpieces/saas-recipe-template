"use server"

import { requirePlatformAdmin, getCurrentUser } from "@/lib/auth/user"
import { createSupabaseClient } from "@/lib/supabase"
import {
  BookWorkflowDepartment,
  BookWorkflowCategory,
  Book,
  BookWorkflow,
  BookWorkflowSearchFilters,
  BookWorkflowSearchResult,
  BookWorkflowDepartmentWithCategories,
  BookWorkflowImportPreview,
  BookWorkflowImportLog,
  CSVBookWorkflowRow,
  BookWorkflowImportError,
  BookWithWorkflows
} from "@/types"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Validation schemas
const BookWorkflowDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  slug: z.string().min(1, "Department slug is required"),
  sort_order: z.number().int().optional()
})

const BookWorkflowCategorySchema = z.object({
  department_id: z.string().uuid(),
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Category slug is required"),
  sort_order: z.number().int().optional()
})

const BookSchema = z.object({
  title: z.string().min(1, "Book title is required"),
  slug: z.string().min(1, "Book slug is required"),
  author: z.string().min(1, "Author name is required")
})

const BookWorkflowSchema = z.object({
  book_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(1, "Workflow name is required"),
  slug: z.string().min(1, "Workflow slug is required"),
  content: z.string().optional(),
  activity_type: z.enum(['Create', 'Assess', 'Plan', 'Workshop']),
  problem_goal: z.enum(['Grow', 'Optimise', 'Lead', 'Strategise', 'Innovate', 'Understand']),
  is_published: z.boolean().optional()
})

const BookWorkflowSearchSchema = z.object({
  query: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
  activityType: z.enum(['Create', 'Assess', 'Plan', 'Workshop', '']).optional(),
  problemGoal: z.enum(['Grow', 'Optimise', 'Lead', 'Strategise', 'Innovate', 'Understand', '']).optional(),
  author: z.string().optional(),
  isPublished: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
})

// Helper function to generate slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Get all book workflow departments with counts
export async function getBookWorkflowDepartments(): Promise<BookWorkflowDepartment[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    // Get departments with workflow counts
    const { data: departments, error: deptsError } = await supabase
      .from("book_workflow_departments")
      .select(`
        *,
        book_workflow_categories (
          id,
          book_workflows (id)
        )
      `)
      .order("sort_order", { ascending: true })

    if (deptsError) {
      console.error("Error fetching book workflow departments:", deptsError)
      throw new Error("Failed to fetch departments")
    }

    // Calculate counts for each department
    const enrichedDepartments: BookWorkflowDepartment[] = (departments || []).map(dept => {
      const categoryCount = dept.book_workflow_categories?.length || 0
      const workflowCount = dept.book_workflow_categories?.reduce((total: number, cat: any) => {
        return total + (cat.book_workflows?.length || 0)
      }, 0) || 0

      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        sort_order: dept.sort_order,
        created_at: dept.created_at,
        categoryCount,
        workflowCount
      }
    })

    return enrichedDepartments
  } catch (error) {
    console.error("Error in getBookWorkflowDepartments:", error)
    throw error
  }
}

// Get department by slug with categories
export async function getBookWorkflowDepartmentBySlug(slug: string): Promise<BookWorkflowDepartmentWithCategories | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    // Get department with categories
    const { data: department, error: deptError } = await supabase
      .from("book_workflow_departments")
      .select(`
        *,
        book_workflow_categories (
          *,
          books (
            id,
            title,
            slug,
            author,
            book_workflows!inner (id)
          )
        )
      `)
      .eq("slug", slug)
      .single()

    if (deptError) {
      if (deptError.code === "PGRST116") {
        return null // Department not found
      }
      console.error("Error fetching book workflow department:", deptError)
      throw new Error("Failed to fetch department")
    }

    // Enrich categories with counts
    const enrichedCategories = (department.book_workflow_categories || []).map((cat: any) => {
      const bookCount = cat.books?.length || 0
      const workflowCount = cat.books?.reduce((total: number, book: any) => {
        return total + (book.book_workflows?.length || 0)
      }, 0) || 0

      return {
        id: cat.id,
        department_id: cat.department_id,
        name: cat.name,
        slug: cat.slug,
        sort_order: cat.sort_order,
        created_at: cat.created_at,
        departmentName: department.name,
        departmentSlug: department.slug,
        bookCount,
        workflowCount
      }
    }).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))

    return {
      id: department.id,
      name: department.name,
      slug: department.slug,
      sort_order: department.sort_order,
      created_at: department.created_at,
      categories: enrichedCategories
    }
  } catch (error) {
    console.error("Error in getBookWorkflowDepartmentBySlug:", error)
    throw error
  }
}

// Get category by department and category slugs
export async function getBookWorkflowCategory(departmentSlug: string, categorySlug: string): Promise<BookWorkflowCategory | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: category, error } = await supabase
      .from("book_workflow_categories")
      .select(`
        *,
        book_workflow_departments!inner (
          name,
          slug
        ),
        books (
          id,
          title,
          slug,
          author,
          book_workflows!inner (id)
        )
      `)
      .eq("slug", categorySlug)
      .eq("book_workflow_departments.slug", departmentSlug)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Category not found
      }
      console.error("Error fetching book workflow category:", error)
      throw new Error("Failed to fetch category")
    }

    const bookCount = category.books?.length || 0
    const workflowCount = category.books?.reduce((total: number, book: any) => {
      return total + (book.book_workflows?.length || 0)
    }, 0) || 0

    return {
      id: category.id,
      department_id: category.department_id,
      name: category.name,
      slug: category.slug,
      sort_order: category.sort_order,
      created_at: category.created_at,
      departmentName: category.book_workflow_departments?.name,
      departmentSlug: category.book_workflow_departments?.slug,
      bookCount,
      workflowCount
    }
  } catch (error) {
    console.error("Error in getBookWorkflowCategory:", error)
    throw error
  }
}

// Get books by category with workflow counts
export async function getBooksByCategory(departmentSlug: string, categorySlug: string): Promise<Book[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: books, error } = await supabase
      .from("books")
      .select(`
        *,
        book_workflows!inner (
          id,
          book_workflow_categories!inner (
            slug,
            book_workflow_departments!inner (
              slug
            )
          )
        )
      `)
      .eq("book_workflows.book_workflow_categories.slug", categorySlug)
      .eq("book_workflows.book_workflow_categories.book_workflow_departments.slug", departmentSlug)
      .eq("book_workflows.is_published", true)
      .order("title", { ascending: true })

    if (error) {
      console.error("Error fetching books by category:", error)
      throw new Error("Failed to fetch books")
    }

    // Deduplicate and count workflows per book
    const bookMap = new Map<string, Book>()

    for (const book of books || []) {
      if (!bookMap.has(book.id)) {
        bookMap.set(book.id, {
          id: book.id,
          title: book.title,
          slug: book.slug,
          author: book.author,
          created_at: book.created_at,
          workflowCount: 0
        })
      }

      const existingBook = bookMap.get(book.id)!
      existingBook.workflowCount = (existingBook.workflowCount || 0) + (book.book_workflows?.length || 0)
    }

    return Array.from(bookMap.values()).sort((a, b) => a.title.localeCompare(b.title))
  } catch (error) {
    console.error("Error in getBooksByCategory:", error)
    throw error
  }
}

// Get book by slug with workflows
export async function getBookWithWorkflows(bookSlug: string): Promise<BookWithWorkflows | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: book, error } = await supabase
      .from("books")
      .select(`
        *,
        book_workflows!inner (
          *,
          book_workflow_categories (
            *,
            book_workflow_departments (
              name,
              slug
            )
          )
        )
      `)
      .eq("slug", bookSlug)
      .eq("book_workflows.is_published", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Book not found
      }
      console.error("Error fetching book with workflows:", error)
      throw new Error("Failed to fetch book")
    }

    // Enrich workflows with category/department info
    const enrichedWorkflows = (book.book_workflows || []).map((workflow: any) => ({
      id: workflow.id,
      book_id: workflow.book_id,
      category_id: workflow.category_id,
      name: workflow.name,
      slug: workflow.slug,
      content: workflow.content,
      activity_type: workflow.activity_type,
      problem_goal: workflow.problem_goal,
      is_published: workflow.is_published,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
      bookTitle: book.title,
      bookSlug: book.slug,
      bookAuthor: book.author,
      categoryName: workflow.book_workflow_categories?.name,
      categorySlug: workflow.book_workflow_categories?.slug,
      departmentName: workflow.book_workflow_categories?.book_workflow_departments?.name,
      departmentSlug: workflow.book_workflow_categories?.book_workflow_departments?.slug
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    return {
      id: book.id,
      title: book.title,
      slug: book.slug,
      author: book.author,
      created_at: book.created_at,
      workflowCount: enrichedWorkflows.length,
      workflows: enrichedWorkflows
    }
  } catch (error) {
    console.error("Error in getBookWithWorkflows:", error)
    throw error
  }
}

// Get workflow by slugs
export async function getBookWorkflow(departmentSlug: string, categorySlug: string, bookSlug: string, workflowSlug: string): Promise<BookWorkflow | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: workflow, error } = await supabase
      .from("book_workflows")
      .select(`
        *,
        books!inner (
          title,
          slug,
          author
        ),
        book_workflow_categories!inner (
          name,
          slug,
          book_workflow_departments!inner (
            name,
            slug
          )
        )
      `)
      .eq("slug", workflowSlug)
      .eq("books.slug", bookSlug)
      .eq("book_workflow_categories.slug", categorySlug)
      .eq("book_workflow_categories.book_workflow_departments.slug", departmentSlug)
      .eq("is_published", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Workflow not found
      }
      console.error("Error fetching book workflow:", error)
      throw new Error("Failed to fetch workflow")
    }

    return {
      id: workflow.id,
      book_id: workflow.book_id,
      category_id: workflow.category_id,
      name: workflow.name,
      slug: workflow.slug,
      content: workflow.content,
      activity_type: workflow.activity_type,
      problem_goal: workflow.problem_goal,
      is_published: workflow.is_published,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
      bookTitle: workflow.books?.title,
      bookSlug: workflow.books?.slug,
      bookAuthor: workflow.books?.author,
      categoryName: workflow.book_workflow_categories?.name,
      categorySlug: workflow.book_workflow_categories?.slug,
      departmentName: workflow.book_workflow_categories?.book_workflow_departments?.name,
      departmentSlug: workflow.book_workflow_categories?.book_workflow_departments?.slug
    }
  } catch (error) {
    console.error("Error in getBookWorkflow:", error)
    throw error
  }
}

// Search book workflows with filters and pagination
export async function searchBookWorkflows(filters: BookWorkflowSearchFilters = {}): Promise<BookWorkflowSearchResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const validated = BookWorkflowSearchSchema.parse(filters)
    const page = validated.page || 1
    const limit = validated.limit || 20
    const offset = (page - 1) * limit

    const supabase = await createSupabaseClient()

    // Build the base query
    let query = supabase
      .from("book_workflows")
      .select(`
        *,
        books (
          title,
          slug,
          author
        ),
        book_workflow_categories (
          name,
          slug,
          book_workflow_departments (
            name,
            slug
          )
        )
      `, { count: 'exact' })
      .eq("is_published", true)

    // Apply filters
    if (validated.query) {
      query = query.textSearch("search_vector", validated.query)
    }

    if (validated.departmentId) {
      query = query.eq("book_workflow_categories.book_workflow_departments.id", validated.departmentId)
    }

    if (validated.categoryId) {
      query = query.eq("category_id", validated.categoryId)
    }

    if (validated.bookId) {
      query = query.eq("book_id", validated.bookId)
    }

    if (validated.activityType) {
      query = query.eq("activity_type", validated.activityType)
    }

    if (validated.problemGoal) {
      query = query.eq("problem_goal", validated.problemGoal)
    }

    if (validated.author) {
      query = query.ilike("books.author", `%${validated.author}%`)
    }

    // Execute query with pagination
    const { data: workflows, error, count } = await query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error searching book workflows:", error)
      throw new Error("Failed to search workflows")
    }

    // Get filter facets
    const [departments, categories, books] = await Promise.all([
      getBookWorkflowDepartments(),
      getAllBookWorkflowCategories(),
      getAllBooks()
    ])

    // Calculate distributions for faceted search
    const activityTypeDistribution: { [key: string]: number } = {}
    const problemGoalDistribution: { [key: string]: number } = {}

    for (const workflow of workflows || []) {
      activityTypeDistribution[workflow.activity_type] = (activityTypeDistribution[workflow.activity_type] || 0) + 1
      problemGoalDistribution[workflow.problem_goal] = (problemGoalDistribution[workflow.problem_goal] || 0) + 1
    }

    // Enrich workflows with related data
    const enrichedWorkflows: BookWorkflow[] = (workflows || []).map(workflow => ({
      id: workflow.id,
      book_id: workflow.book_id,
      category_id: workflow.category_id,
      name: workflow.name,
      slug: workflow.slug,
      content: workflow.content,
      activity_type: workflow.activity_type,
      problem_goal: workflow.problem_goal,
      is_published: workflow.is_published,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
      bookTitle: workflow.books?.title,
      bookSlug: workflow.books?.slug,
      bookAuthor: workflow.books?.author,
      categoryName: workflow.book_workflow_categories?.name,
      categorySlug: workflow.book_workflow_categories?.slug,
      departmentName: workflow.book_workflow_categories?.book_workflow_departments?.name,
      departmentSlug: workflow.book_workflow_categories?.book_workflow_departments?.slug
    }))

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return {
      workflows: enrichedWorkflows,
      totalCount,
      departments,
      categories,
      books,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      activityTypeDistribution,
      problemGoalDistribution
    }
  } catch (error) {
    console.error("Error in searchBookWorkflows:", error)
    throw error
  }
}

// Get all book workflow categories (for filters)
export async function getAllBookWorkflowCategories(): Promise<BookWorkflowCategory[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: categories, error } = await supabase
      .from("book_workflow_categories")
      .select(`
        *,
        book_workflow_departments (
          name,
          slug
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching book workflow categories:", error)
      throw new Error("Failed to fetch categories")
    }

    return (categories || []).map(cat => ({
      id: cat.id,
      department_id: cat.department_id,
      name: cat.name,
      slug: cat.slug,
      sort_order: cat.sort_order,
      created_at: cat.created_at,
      departmentName: cat.book_workflow_departments?.name,
      departmentSlug: cat.book_workflow_departments?.slug
    }))
  } catch (error) {
    console.error("Error in getAllBookWorkflowCategories:", error)
    throw error
  }
}

// Get all books (for filters)
export async function getAllBooks(): Promise<Book[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createSupabaseClient()

    const { data: books, error } = await supabase
      .from("books")
      .select("*")
      .order("title", { ascending: true })

    if (error) {
      console.error("Error fetching books:", error)
      throw new Error("Failed to fetch books")
    }

    return books || []
  } catch (error) {
    console.error("Error in getAllBooks:", error)
    throw error
  }
}

// Preview CSV import (validation only)
export async function previewBookWorkflowCSV(csvData: CSVBookWorkflowRow[]): Promise<BookWorkflowImportPreview> {
  try {
    const user = await requirePlatformAdmin()

    const errors: BookWorkflowImportError[] = []
    const validRows: CSVBookWorkflowRow[] = []
    const summary = {
      departmentsFound: [] as string[],
      categoriesToCreate: [] as string[],
      booksToCreate: [] as string[],
      workflowsToCreate: 0,
      existingCategories: [] as string[],
      existingBooks: [] as string[],
      activityTypeDistribution: {} as { [key: string]: number },
      problemGoalDistribution: {} as { [key: string]: number }
    }

    const supabase = await createSupabaseClient()

    // Get existing data
    const [
      { data: departments },
      { data: categories },
      { data: books }
    ] = await Promise.all([
      supabase.from("book_workflow_departments").select("name, slug"),
      supabase.from("book_workflow_categories").select("name, slug"),
      supabase.from("books").select("title, slug, author")
    ])

    const departmentMap = new Map((departments || []).map(d => [d.name.toLowerCase(), d]))
    const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c]))
    const bookMap = new Map((books || []).map(b => [`${b.title.toLowerCase()}:${b.author.toLowerCase()}`, b]))

    // Validate each row
    csvData.forEach((row, index) => {
      const rowNumber = index + 1

      // Required field validation
      if (!row.department?.trim()) {
        errors.push({ row: rowNumber, field: "department", message: "Department is required", value: row.department })
      }

      if (!row.category?.trim()) {
        errors.push({ row: rowNumber, field: "category", message: "Category is required", value: row.category })
      }

      if (!row.book?.trim()) {
        errors.push({ row: rowNumber, field: "book", message: "Book title is required", value: row.book })
      }

      if (!row.author?.trim()) {
        errors.push({ row: rowNumber, field: "author", message: "Author is required", value: row.author })
      }

      if (!row.workflow?.trim()) {
        errors.push({ row: rowNumber, field: "workflow", message: "Workflow name is required", value: row.workflow })
      }

      // Enum validation
      const validActivityTypes = ['Create', 'Assess', 'Plan', 'Workshop']
      if (!validActivityTypes.includes(row.activity_type)) {
        errors.push({
          row: rowNumber,
          field: "activity_type",
          message: `Activity type must be one of: ${validActivityTypes.join(', ')}`,
          value: row.activity_type
        })
      }

      const validProblemGoals = ['Grow', 'Optimise', 'Lead', 'Strategise', 'Innovate', 'Understand']
      if (!validProblemGoals.includes(row.problem_goal)) {
        errors.push({
          row: rowNumber,
          field: "problem_goal",
          message: `Problem/goal must be one of: ${validProblemGoals.join(', ')}`,
          value: row.problem_goal
        })
      }

      // Department validation (must exist)
      if (row.department?.trim()) {
        const dept = departmentMap.get(row.department.toLowerCase())
        if (!dept) {
          errors.push({
            row: rowNumber,
            field: "department",
            message: "Department not found. Must be one of the predefined departments.",
            value: row.department
          })
        } else if (!summary.departmentsFound.includes(dept.name)) {
          summary.departmentsFound.push(dept.name)
        }
      }

      // Category validation (track new ones)
      if (row.category?.trim()) {
        const cat = categoryMap.get(row.category.toLowerCase())
        if (cat) {
          if (!summary.existingCategories.includes(cat.name)) {
            summary.existingCategories.push(cat.name)
          }
        } else if (!summary.categoriesToCreate.includes(row.category)) {
          summary.categoriesToCreate.push(row.category)
        }
      }

      // Book validation (track new ones)
      if (row.book?.trim() && row.author?.trim()) {
        const bookKey = `${row.book.toLowerCase()}:${row.author.toLowerCase()}`
        const book = bookMap.get(bookKey)
        if (book) {
          if (!summary.existingBooks.includes(book.title)) {
            summary.existingBooks.push(book.title)
          }
        } else if (!summary.booksToCreate.includes(`${row.book} by ${row.author}`)) {
          summary.booksToCreate.push(`${row.book} by ${row.author}`)
        }
      }

      // Track distributions
      if (validActivityTypes.includes(row.activity_type)) {
        summary.activityTypeDistribution[row.activity_type] = (summary.activityTypeDistribution[row.activity_type] || 0) + 1
      }

      if (validProblemGoals.includes(row.problem_goal)) {
        summary.problemGoalDistribution[row.problem_goal] = (summary.problemGoalDistribution[row.problem_goal] || 0) + 1
      }

      // If row is valid, add to valid rows
      if (!errors.some(error => error.row === rowNumber)) {
        validRows.push(row)
        summary.workflowsToCreate++
      }
    })

    return {
      isValid: errors.length === 0,
      totalRows: csvData.length,
      validRows: validRows.length,
      errors,
      summary,
      sampleData: csvData.slice(0, 5) // First 5 rows for preview
    }
  } catch (error) {
    console.error("Error in previewBookWorkflowCSV:", error)
    throw error
  }
}

// Execute CSV import
export async function executeBookWorkflowCSVImport(csvData: CSVBookWorkflowRow[], fileName: string): Promise<BookWorkflowImportLog> {
  try {
    const user = await requirePlatformAdmin()

    const supabase = await createSupabaseClient()

    // Call the database function for atomic import
    const { data: result, error } = await supabase
      .rpc("import_book_workflows", {
        csv_data: csvData,
        file_name: fileName
      })

    if (error) {
      console.error("Error executing book workflow CSV import:", error)
      throw new Error("Failed to import workflows")
    }

    // Create import log entry
    const importLog: BookWorkflowImportLog = {
      file_name: fileName,
      total_rows: csvData.length,
      successful_rows: result.stats.created_workflows,
      failed_rows: result.stats.errors_count,
      categories_created: result.stats.created_categories,
      books_created: result.stats.created_books,
      workflows_created: result.stats.created_workflows,
      error_summary: result.errors,
      imported_by: user.clerkId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      importerName: user.name,
      duration: 0,
      status: result.stats.errors_count > 0 ? 'completed' : 'completed'
    }

    // Revalidate relevant paths
    revalidatePath("/book-workflows")
    revalidatePath("/admin/book-workflows")

    return importLog
  } catch (error) {
    console.error("Error in executeBookWorkflowCSVImport:", error)
    throw error
  }
}

// Delete all book workflow data
export async function deleteAllBookWorkflowData(): Promise<void> {
  try {
    const user = await requirePlatformAdmin()

    const supabase = await createSupabaseClient()

    // Delete in correct order due to foreign key constraints
    const { error: workflowsError } = await supabase
      .from("book_workflows")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all rows

    if (workflowsError) {
      console.error("Error deleting book workflows:", workflowsError)
      throw new Error("Failed to delete workflows")
    }

    const { error: booksError } = await supabase
      .from("books")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all rows

    if (booksError) {
      console.error("Error deleting books:", booksError)
      throw new Error("Failed to delete books")
    }

    const { error: categoriesError } = await supabase
      .from("book_workflow_categories")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all rows

    if (categoriesError) {
      console.error("Error deleting book workflow categories:", categoriesError)
      throw new Error("Failed to delete categories")
    }

    // Departments are seeded data - don't delete them

    // Revalidate relevant paths
    revalidatePath("/book-workflows")
    revalidatePath("/admin/book-workflows")
  } catch (error) {
    console.error("Error in deleteAllBookWorkflowData:", error)
    throw error
  }
}

// Get book workflow statistics (for admin dashboard)
export async function getBookWorkflowStatistics() {
  try {
    const user = await requirePlatformAdmin()

    const supabase = await createSupabaseClient()

    const [
      { count: departmentCount },
      { count: categoryCount },
      { count: bookCount },
      { count: workflowCount }
    ] = await Promise.all([
      supabase.from("book_workflow_departments").select("*", { count: "exact", head: true }),
      supabase.from("book_workflow_categories").select("*", { count: "exact", head: true }),
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("book_workflows").select("*", { count: "exact", head: true })
    ])

    return {
      departments: departmentCount || 0,
      categories: categoryCount || 0,
      books: bookCount || 0,
      workflows: workflowCount || 0
    }
  } catch (error) {
    console.error("Error in getBookWorkflowStatistics:", error)
    throw error
  }
}