import { Tables } from "@/types/supabase"
import { z } from "zod"

export type Organization = Tables<"organisations">
export type User = Tables<"users">

// Validation schemas
export const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255, "Name must be less than 255 characters"),
})

export const updateOrganizationSchema = organizationSchema.extend({
  id: z.string().uuid("Invalid organization ID"),
})

export interface OrganizationWithStats extends Organization {
  _count: {
    users: number
    course_enrollments: number
  }
}