"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getOrganizationsForDropdown } from "@/lib/actions/organization.actions"

interface OrganizationPickerProps {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  required?: boolean
  placeholder?: string
  className?: string
}

export function OrganizationPicker({
  value,
  onValueChange,
  name = "organisationId",
  required = false,
  placeholder = "Select organization",
  className
}: OrganizationPickerProps) {
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setIsLoading(true)
        setError(null)
        const orgs = await getOrganizationsForDropdown()
        setOrganizations(orgs)
      } catch (err) {
        console.error("Failed to load organizations:", err)
        setError("Failed to load organizations")
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganizations()
  }, [])

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading organizations..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Error loading organizations" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <>
      <Select
        value={value}
        onValueChange={onValueChange}
        name={name}
        required={required}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Hidden input for form submission if no onValueChange is provided */}
      {!onValueChange && (
        <input type="hidden" name={name} value={value} />
      )}
    </>
  )
}