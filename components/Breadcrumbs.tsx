"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const SECTION_LABELS: Record<string, string> = {
  courses: "Courses",
  workflows: "Workflows",
  "book-workflows": "Book Workflows",
  users: "Users",
  organizations: "Organisations",
  reports: "Reports"
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (!pathname.startsWith("/admin")) return null

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    ...segments.slice(1).map((segment, index) => {
      const href = "/admin/" + segments.slice(1, index + 2).join("/")
      const label = SECTION_LABELS[segment] || segment.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase())
      return { label, href }
    })
  ]

  // Maximum 3 levels
  const displayBreadcrumbs = breadcrumbs.slice(0, 3)

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      {displayBreadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          {index === displayBreadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}