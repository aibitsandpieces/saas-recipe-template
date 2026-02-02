"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Users, Trash2, Eye } from "lucide-react"
import { OrganizationWithStats } from "@/lib/types/organization"
import { EditOrganizationDialog } from "./EditOrganizationDialog"
import { DeleteOrganizationDialog } from "./DeleteOrganizationDialog"
import { ViewOrganizationUsersDialog } from "./ViewOrganizationUsersDialog"

interface OrganizationActionsDropdownProps {
  organization: OrganizationWithStats
}

export function OrganizationActionsDropdown({ organization }: OrganizationActionsDropdownProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewUsersDialogOpen, setViewUsersDialogOpen] = useState(false)

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
          <DropdownMenuItem onClick={() => setViewUsersDialogOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Users ({organization._count.users})
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Organization
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <EditOrganizationDialog
        organization={organization}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* View Users Dialog */}
      <ViewOrganizationUsersDialog
        organization={organization}
        open={viewUsersDialogOpen}
        onOpenChange={setViewUsersDialogOpen}
      />

      {/* Delete Dialog */}
      <DeleteOrganizationDialog
        organization={organization}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}