"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  Database,
  FolderTree
} from "lucide-react"
import { toast } from "sonner"
import {
  deleteAllWorkflows,
  deleteWorkflowsByCategory,
  resetWorkflowLibrary
} from "@/lib/actions/workflow.actions"

interface WorkflowBulkActionsProps {
  totalWorkflows: number
  onActionComplete?: () => void
}

type BulkAction = "delete_all" | "reset_all" | null

export function WorkflowBulkActions({
  totalWorkflows,
  onActionComplete
}: WorkflowBulkActionsProps) {
  const [currentAction, setCurrentAction] = useState<BulkAction>(null)
  const [confirmationText, setConfirmationText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDeleteAllWorkflows = async () => {
    setIsProcessing(true)
    try {
      const result = await deleteAllWorkflows()
      toast.success(`Successfully deleted ${result.deletedCount} workflows`)
      setCurrentAction(null)
      setConfirmationText("")
      onActionComplete?.()
    } catch (error) {
      console.error("Delete all failed:", error)
      toast.error("Failed to delete workflows")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetLibrary = async () => {
    setIsProcessing(true)
    try {
      const result = await resetWorkflowLibrary()
      toast.success(
        `Library reset complete: ${result.deletedWorkflows} workflows, ${result.deletedDepartments} departments, ${result.deletedCategories} categories deleted`
      )
      setCurrentAction(null)
      setConfirmationText("")
      onActionComplete?.()
    } catch (error) {
      console.error("Reset failed:", error)
      toast.error("Failed to reset workflow library")
    } finally {
      setIsProcessing(false)
    }
  }

  const getConfirmationRequirement = () => {
    switch (currentAction) {
      case "delete_all":
        return "DELETE ALL WORKFLOWS"
      case "reset_all":
        return "RESET ENTIRE LIBRARY"
      default:
        return ""
    }
  }

  const isConfirmationValid = confirmationText === getConfirmationRequirement()

  const handleConfirm = async () => {
    if (!isConfirmationValid) return

    switch (currentAction) {
      case "delete_all":
        await handleDeleteAllWorkflows()
        break
      case "reset_all":
        await handleResetLibrary()
        break
    }
  }

  const closeDialog = () => {
    setCurrentAction(null)
    setConfirmationText("")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Bulk Actions
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setCurrentAction("delete_all")}
            disabled={totalWorkflows === 0}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <Database className="mr-2 h-4 w-4" />
            Delete All Workflows ({totalWorkflows})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCurrentAction("reset_all")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset Entire Library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <Dialog open={currentAction !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {currentAction === "delete_all" ? "Delete All Workflows" : "Reset Workflow Library"}
            </DialogTitle>
            <DialogDescription>
              {currentAction === "delete_all" ? (
                <>
                  This will permanently delete <strong>all {totalWorkflows} workflows</strong> and their files.
                  Categories and departments will remain intact.
                </>
              ) : (
                <>
                  This will permanently delete <strong>everything</strong> in the workflow library:
                  workflows, departments, categories, and all files. This is useful for fresh CSV imports.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Impact Summary */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">What will be deleted:</Label>
              <div className="space-y-1 text-sm">
                {currentAction === "delete_all" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {totalWorkflows} workflows
                      </Badge>
                      <span>All workflow content and metadata</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        Files
                      </Badge>
                      <span>All attached workflow files</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <Badge variant="outline" className="text-xs border-green-200">
                        Preserved
                      </Badge>
                      <span>Categories and departments will remain</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        Everything
                      </Badge>
                      <span>All workflows, departments, categories, and files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Fresh Start
                      </Badge>
                      <span>Ready for new CSV import</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <strong>{getConfirmationRequirement()}</strong> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={getConfirmationRequirement()}
                className={isConfirmationValid ? "border-green-300" : "border-red-300"}
                disabled={isProcessing}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isConfirmationValid || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {currentAction === "delete_all" ? "Delete All Workflows" : "Reset Library"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}