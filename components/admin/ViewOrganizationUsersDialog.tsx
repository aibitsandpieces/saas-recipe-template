"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, Mail, Calendar, Loader2, User, X } from "lucide-react"
import { getOrganizationUsers } from "@/lib/actions/organization.actions"
import {
  OrganizationWithStats,
  User as UserType,
} from "@/lib/types/organization"
import { toast } from "sonner"

interface ViewOrganizationUsersDialogProps {
  organization: OrganizationWithStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewOrganizationUsersDialog({
  organization,
  open,
  onOpenChange,
}: ViewOrganizationUsersDialogProps) {
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load users when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open, organization.id])

  async function loadUsers() {
    setIsLoading(true)
    try {
      const organizationUsers = await getOrganizationUsers(organization.id)
      setUsers(organizationUsers)
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Failed to load organization users")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to format user display
  function formatUserCreatedDate(dateString: string | null): string {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Users in {organization.name}</span>
          </DialogTitle>
          <DialogDescription>
            View and manage users who belong to this organization
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users yet</h3>
              <p className="text-muted-foreground">
                This organization doesn't have any users assigned.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {user.name || "Unknown User"}
                          </div>
                          {user.email && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              {user.email}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatUserCreatedDate(user.created_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? 's' : ''} in this organization
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}