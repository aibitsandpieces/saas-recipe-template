"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { UserSearchFilters } from "@/types"

interface UserSearchControlsProps {
  filters: UserSearchFilters
  onFiltersChange: (filters: UserSearchFilters) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function UserSearchControls({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading = false
}: UserSearchControlsProps) {
  const handleSearch = (query: string) => {
    onFiltersChange({ ...filters, query, page: 1 })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex space-x-2">
          <Input
            placeholder="Search users by name or email..."
            value={filters.query || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}