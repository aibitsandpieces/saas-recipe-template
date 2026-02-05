"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrganizationPicker } from "@/components/admin/OrganizationPicker"
import { UserPlus, Mail, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { inviteUser } from "@/lib/actions/user-management.actions"

interface InviteUserDialogProps {
  onUserInvited?: () => void
}

export function InviteUserDialog({ onUserInvited }: InviteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const { toast } = useToast()

  const handleInviteUser = async (formData: FormData) => {
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const role = formData.get("role") as "org_admin" | "org_member"
    const organisationId = formData.get("organisationId") as string

    if (!email || !name || !role || !organisationId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInviting(true)
      await inviteUser({
        email,
        name,
        role,
        organisationId,
        courseIds: [] // TODO: Add course selection
      })

      toast({
        title: "Success",
        description: "User invitation sent successfully.",
      })

      setIsOpen(false)
      onUserInvited?.()
    } catch (error) {
      console.error('Failed to invite user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          handleInviteUser(formData)
        }}>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select name="role" required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_member">Member</SelectItem>
                  <SelectItem value="org_admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Organization
              </Label>
              <div className="col-span-3">
                <OrganizationPicker
                  name="organisationId"
                  required
                  placeholder="Select organization"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}