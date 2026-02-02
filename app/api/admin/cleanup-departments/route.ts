import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/user'
import { createSupabaseClient } from '@/lib/supabase'
import { deleteWorkflowDepartment } from '@/lib/actions/workflow.actions'

/**
 * API endpoint to clean up CSV-imported workflow departments
 * DELETE /api/admin/cleanup-departments
 */
export async function DELETE(request: NextRequest) {
  try {
    // Ensure user is platform admin
    await requirePlatformAdmin()

    const supabase = await createSupabaseClient()

    // Get departments created from CSV imports (after 18:18:00 on 2026-02-02)
    const { data: csvDepartments, error: fetchError } = await supabase
      .from("workflow_departments")
      .select("id, name, created_at")
      .gte("created_at", "2026-02-02 18:18:00+00")
      .order("created_at")

    if (fetchError) {
      console.error("Error fetching departments:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch departments to delete" },
        { status: 500 }
      )
    }

    if (!csvDepartments || csvDepartments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No CSV departments found to delete",
        deleted: 0,
        errors: 0,
        details: []
      })
    }

    // Group by import batch
    const firstCSV = csvDepartments.filter(d => d.created_at === "2026-02-02T18:18:50.048782+00:00")
    const secondCSV = csvDepartments.filter(d => d.created_at === "2026-02-02T20:31:51.748137+00:00")

    console.log(`Found ${csvDepartments.length} departments to delete:`)
    console.log(`  • First CSV Import: ${firstCSV.length} departments`)
    console.log(`  • Second CSV Import: ${secondCSV.length} departments`)

    const results = []
    let deleted = 0
    let errors = 0

    // Delete each department using the existing function
    for (const department of csvDepartments) {
      try {
        await deleteWorkflowDepartment(department.id)
        console.log(`✅ Deleted: ${department.name}`)
        results.push({
          id: department.id,
          name: department.name,
          status: "deleted",
          error: null
        })
        deleted++
      } catch (error) {
        console.error(`❌ Failed to delete ${department.name}:`, error)
        results.push({
          id: department.id,
          name: department.name,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        })
        errors++
      }
    }

    // Verify final state
    const { data: remainingDepts } = await supabase
      .from("workflow_departments")
      .select("id, name, created_at")
      .order("created_at")

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up CSV departments`,
      deleted,
      errors,
      totalProcessed: csvDepartments.length,
      remainingDepartments: remainingDepts?.length || 0,
      details: results,
      summary: {
        firstCSVDeleted: firstCSV.length,
        secondCSVDeleted: secondCSV.length,
        originalDepartmentsPreserved: remainingDepts?.length || 0
      }
    })

  } catch (error) {
    console.error("Error in cleanup endpoint:", error)
    return NextResponse.json(
      {
        error: "Failed to perform cleanup",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to preview what would be deleted
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin()

    const supabase = await createSupabaseClient()

    // Get current state
    const { data: allDepts } = await supabase
      .from("workflow_departments")
      .select("id, name, created_at")
      .order("created_at")

    const { data: csvDepts } = await supabase
      .from("workflow_departments")
      .select("id, name, created_at")
      .gte("created_at", "2026-02-02 18:18:00+00")
      .order("created_at")

    const originalDepts = allDepts?.filter(d => d.created_at < "2026-02-02 18:18:00+00") || []
    const firstCSV = csvDepts?.filter(d => d.created_at === "2026-02-02T18:18:50.048782+00:00") || []
    const secondCSV = csvDepts?.filter(d => d.created_at === "2026-02-02T20:31:51.748137+00:00") || []

    return NextResponse.json({
      currentState: {
        totalDepartments: allDepts?.length || 0,
        originalDepartments: originalDepts.length,
        csvImportedDepartments: csvDepts?.length || 0
      },
      toDelete: {
        firstCSVImport: {
          count: firstCSV.length,
          departments: firstCSV.map(d => d.name)
        },
        secondCSVImport: {
          count: secondCSV.length,
          departments: secondCSV.map(d => d.name).slice(0, 10) // First 10 for preview
        },
        totalToDelete: csvDepts?.length || 0
      },
      toPreserve: {
        count: originalDepts.length,
        departments: originalDepts.map(d => d.name)
      }
    })

  } catch (error) {
    console.error("Error in preview endpoint:", error)
    return NextResponse.json(
      { error: "Failed to preview cleanup" },
      { status: 500 }
    )
  }
}