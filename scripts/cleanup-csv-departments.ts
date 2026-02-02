#!/usr/bin/env tsx

/**
 * Script to clean up workflow departments created from CSV imports
 * This will delete only departments created from CSV imports while preserving original departments
 */

import { deleteWorkflowDepartment } from "@/lib/actions/workflow.actions"
import { createSupabaseClient } from "@/lib/supabase"

async function cleanupCSVDepartments() {
  console.log("🔍 Starting CSV department cleanup...")

  const supabase = await createSupabaseClient()

  // Get departments created from CSV imports
  const { data: csvDepartments, error: fetchError } = await supabase
    .from("workflow_departments")
    .select("id, name, created_at")
    .gte("created_at", "2026-02-02 18:18:00+00")
    .order("created_at")

  if (fetchError) {
    console.error("❌ Error fetching departments:", fetchError)
    return
  }

  if (!csvDepartments || csvDepartments.length === 0) {
    console.log("✅ No CSV departments found to delete")
    return
  }

  console.log(`📊 Found ${csvDepartments.length} departments to delete:`)

  // Group by import batch for display
  const firstCSV = csvDepartments.filter(d => d.created_at === "2026-02-02T18:18:50.048782+00:00")
  const secondCSV = csvDepartments.filter(d => d.created_at === "2026-02-02T20:31:51.748137+00:00")

  console.log(`  • First CSV Import (${firstCSV.length}): ${firstCSV.map(d => d.name).join(", ")}`)
  console.log(`  • Second CSV Import (${secondCSV.length}): ${secondCSV.map(d => d.name).slice(0, 5).join(", ")}${secondCSV.length > 5 ? ` and ${secondCSV.length - 5} more...` : ""}`)

  // Confirm deletion
  console.log("\n⚠️  This will permanently delete these departments and any associated workflows.")
  console.log("🔄 Starting deletion process...")

  let deleted = 0
  let errors = 0

  // Delete each department using the existing function
  for (const department of csvDepartments) {
    try {
      await deleteWorkflowDepartment(department.id)
      console.log(`✅ Deleted: ${department.name}`)
      deleted++
    } catch (error) {
      console.error(`❌ Failed to delete ${department.name}:`, error)
      errors++
    }
  }

  console.log(`\n📈 Cleanup Summary:`)
  console.log(`  • Successfully deleted: ${deleted} departments`)
  console.log(`  • Errors: ${errors}`)
  console.log(`  • Total processed: ${csvDepartments.length}`)

  // Verify final state
  console.log("\n🔍 Verifying cleanup...")

  const { data: remainingDepts, error: verifyError } = await supabase
    .from("workflow_departments")
    .select("id, name, created_at")
    .order("created_at")

  if (verifyError) {
    console.error("❌ Error verifying cleanup:", verifyError)
    return
  }

  console.log(`✅ Remaining departments: ${remainingDepts?.length || 0}`)
  if (remainingDepts && remainingDepts.length > 0) {
    console.log("📋 Original departments preserved:")
    remainingDepts.forEach(dept => {
      console.log(`  • ${dept.name} (${dept.created_at})`)
    })
  }

  console.log("\n🎉 CSV department cleanup completed!")
}

// Only run if this file is executed directly
if (require.main === module) {
  cleanupCSVDepartments()
    .then(() => {
      console.log("✅ Script completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Script failed:", error)
      process.exit(1)
    })
}

export { cleanupCSVDepartments }