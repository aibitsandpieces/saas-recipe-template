"use client"

import { useState, useId } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteAllBookWorkflowData } from "@/lib/actions/book-workflow.actions"

export function DeleteAllBookWorkflowDataButton() {
  const dialogId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (confirmText !== "DELETE ALL BOOK WORKFLOWS") {
      setError("Please type the confirmation text exactly as shown")
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await deleteAllBookWorkflowData()
      setIsOpen(false)
      setConfirmText("")
      // Refresh the page to show updated statistics
      window.location.reload()
    } catch (err: any) {
      setError(err.message || "Failed to delete book workflow data")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open)
      if (!open) {
        setConfirmText("")
        setError(null)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full" suppressHydrationWarning>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All Book Workflow Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete All Book Workflow Data
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              This will permanently delete ALL book workflow data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>All book workflows</li>
              <li>All books</li>
              <li>All categories (departments will remain)</li>
            </ul>
            <p className="font-semibold text-red-600">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: This will delete all book workflow data permanently.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type "DELETE ALL BOOK WORKFLOWS" to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE ALL BOOK WORKFLOWS"
              disabled={isDeleting}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== "DELETE ALL BOOK WORKFLOWS"}
          >
            {isDeleting ? (
              <>
                <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}