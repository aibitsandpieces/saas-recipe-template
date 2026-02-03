"use client"

import { Search, X } from "lucide-react"
import { BookWorkflowSearchFilters } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ACTIVITY_TYPES = [
  { value: "all", label: "All Activity Types" },
  { value: "Create", label: "Create" },
  { value: "Assess", label: "Assess" },
  { value: "Plan", label: "Plan" },
  { value: "Workshop", label: "Workshop" }
]

const PROBLEM_GOALS = [
  { value: "all", label: "All Problem/Goals" },
  { value: "Grow", label: "Grow" },
  { value: "Optimise", label: "Optimise" },
  { value: "Lead", label: "Lead" },
  { value: "Strategise", label: "Strategise" },
  { value: "Innovate", label: "Innovate" },
  { value: "Understand", label: "Understand" }
]

interface SearchFiltersClientProps {
  filters: BookWorkflowSearchFilters
}

export function SearchFiltersClient({ filters }: SearchFiltersClientProps) {
  const handleUpdateFilters = (newFilters: BookWorkflowSearchFilters) => {
    const params = new URLSearchParams()
    if (newFilters.query) params.set('q', newFilters.query)
    if (newFilters.activityType) params.set('activity', newFilters.activityType)
    if (newFilters.problemGoal) params.set('goal', newFilters.problemGoal)
    if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page.toString())

    const newUrl = params.toString() ? `?${params.toString()}` : '/book-workflows'
    if (typeof window !== 'undefined') {
      window.location.href = newUrl
    }
  }
  const hasActiveFilters = filters.query || filters.activityType || filters.problemGoal

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search workflows..."
              value={filters.query || ""}
              onChange={(e) => handleUpdateFilters({ ...filters, query: e.target.value, page: 1 })}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={filters.activityType || "all"}
          onValueChange={(value) => handleUpdateFilters({ ...filters, activityType: value === 'all' ? undefined : value as 'Create' | 'Assess' | 'Plan' | 'Workshop' | '', page: 1 })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.problemGoal || "all"}
          onValueChange={(value) => handleUpdateFilters({ ...filters, problemGoal: value === 'all' ? undefined : value as 'Grow' | 'Optimise' | 'Lead' | 'Strategise' | 'Innovate' | 'Understand' | '', page: 1 })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Problem/Goal" />
          </SelectTrigger>
          <SelectContent>
            {PROBLEM_GOALS.map((goal) => (
              <SelectItem key={goal.value} value={goal.value}>
                {goal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={() => handleUpdateFilters({ page: 1 })}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex gap-2 flex-wrap">
          {filters.query && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.query}"
              <button
                onClick={() => handleUpdateFilters({ ...filters, query: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.activityType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Activity: {filters.activityType}
              <button
                onClick={() => handleUpdateFilters({ ...filters, activityType: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.problemGoal && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Goal: {filters.problemGoal}
              <button
                onClick={() => handleUpdateFilters({ ...filters, problemGoal: undefined, page: 1 })}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}