"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react"
import { deleteOrganization } from "@/lib/actions/organization.actions"
import { OrganizationWithStats } from "@/lib/types/organization"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DeleteOrganizationDialogProps {
  organization: OrganizationWithStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const router = useRouter()

  const expectedConfirmation = organization.name
  const isConfirmationValid = confirmationText === expectedConfirmation
  const hasUsers = organization._count.users > 0
  const hasEnrollments = organization._count.course_enrollments > 0
  const canDelete = !hasUsers && !hasEnrollments

  async function handleDelete() {
    if (!isConfirmationValid || !canDelete) return

    setIsLoading(true)

    try {
      await deleteOrganization(organization.id)

      toast.success(`Organization "${organization.name}" has been deleted`)

      // Close dialog
      onOpenChange(false)

      // Refresh the page to remove deleted organization
      router.refresh()
    } catch (error) {
      console.error("Error deleting organization:", error)

      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete organization. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Reset confirmation text when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setConfirmationText("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Delete Organization</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the organization and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Details */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Organization to delete:</h4>
            <div className="space-y-2">
              <div className="font-semibold">{organization.name}</div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Users:</span>
                  <Badge variant={hasUsers ? "destructive" : "secondary"}>
                    {organization._count.users}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Course Access:</span>
                  <Badge variant={hasEnrollments ? "destructive" : "secondary"}>
                    {organization._count.course_enrollments}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Deletion Blockers */}
          {!canDelete && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <h4 className="font-medium text-destructive mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cannot Delete Organization
              </h4>
              <div className="text-sm space-y-1">
                {hasUsers && (
                  <p>• This organization has {organization._count.users} user(s). Please transfer or remove users first.</p>
                )}
                {hasEnrollments && (
                  <p>• This organization has access to {organization._count.course_enrollments} course(s). Please remove course enrollments first.</p>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Input (only if can delete) */}
          {canDelete && (
            <div className="space-y-3">
              <Label htmlFor="confirmation">
                Type <strong>{expectedConfirmation}</strong> to confirm deletion:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={expectedConfirmation}
                disabled={isLoading}
                className={
                  confirmationText && !isConfirmationValid
                    ? "border-destructive focus:border-destructive"
                    : ""
                }
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-sm text-destructive">
                  Text doesn't match. Please type "{expectedConfirmation}" exactly.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || !isConfirmationValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Fix missing React import
import React from "react"