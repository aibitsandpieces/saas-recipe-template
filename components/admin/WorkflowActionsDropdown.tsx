"use client"

import React, { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { deleteWorkflow } from "@/lib/actions/workflow.actions"

interface WorkflowActionsDropdownProps {
  workflowId: string
  workflowName: string
  onDeleted?: () => void
}

export function WorkflowActionsDropdown({
  workflowId,
  workflowName,
  onDeleted
}: WorkflowActionsDropdownProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteWorkflow(workflowId)
      toast.success("Workflow deleted successfully")
      setShowDeleteDialog(false)
      onDeleted?.()
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("Failed to delete workflow")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/workflows/${workflowId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Workflow
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Workflow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Simple Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Workflow
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{workflowName}"</strong>?
              This action cannot be undone and will also delete:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-gray-600">
            <div>• All attached files</div>
            <div>• Workflow metadata and content</div>
            <div>• Any external links or references</div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}