"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Loader2, Save, X } from "lucide-react"
import { updateOrganization } from "@/lib/actions/organization.actions"
import {
  updateOrganizationSchema,
  OrganizationWithStats,
} from "@/lib/types/organization"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditOrganizationDialogProps {
  organization: OrganizationWithStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditOrganizationDialog({
  organization,
  open,
  onOpenChange,
}: EditOrganizationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof updateOrganizationSchema>>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      id: organization.id,
      name: organization.name,
    },
  })

  // Reset form when organization changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        id: organization.id,
        name: organization.name,
      })
    }
  }, [organization, open, form])

  async function onSubmit(values: z.infer<typeof updateOrganizationSchema>) {
    setIsLoading(true)

    try {
      const updatedOrganization = await updateOrganization(values)

      toast.success(`Organization updated to "${updatedOrganization.name}"`)

      // Close dialog
      onOpenChange(false)

      // Refresh the page to show updated organization
      router.refresh()
    } catch (error) {
      console.error("Error updating organization:", error)

      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update organization. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update the organization details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter organization name..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}