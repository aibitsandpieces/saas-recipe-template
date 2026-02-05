"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserWithRole } from "@/types"
import { AlertTriangle } from "lucide-react"

interface DeleteUserDialogProps {
  user: UserWithRole | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteUserDialog({
  user,
  open,
  onClose,
  onConfirm,
  isLoading = false
}: DeleteUserDialogProps) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete User
          </DialogTitle>
          <DialogDescription className="text-left">
            Are you sure you want to permanently delete{" "}
            <strong>
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.name || 'Unknown User'
              }
            </strong> ({user.email})?
            <br />
            <br />
            <strong className="text-destructive">This action cannot be undone.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <p className="text-sm text-destructive font-medium">
            This will delete:
          </p>
          <ul className="text-sm text-destructive mt-1 space-y-1">
            <li>• User account and profile</li>
            <li>• All role assignments</li>
            <li>• All course enrollments</li>
            <li>• All invitations created by this user</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}