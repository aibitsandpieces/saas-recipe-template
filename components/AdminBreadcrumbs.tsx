'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export default function AdminBreadcrumbs() {
  const pathname = usePathname()

  // Parse pathname to build breadcrumb trail
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items
  const breadcrumbs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/admin', label: 'Admin', icon: null }
  ]

  // Add current section if we're in a specific admin area
  if (segments[1]) {
    const sectionMap = {
      'courses': 'Courses',
      'workflows': 'Workflows',
      'book-workflows': 'Book Workflows',
      'users': 'Users',
      'organizations': 'Organizations',
      'reports': 'Reports'
    }

    const sectionLabel = sectionMap[segments[1] as keyof typeof sectionMap] || segments[1]
    breadcrumbs.push({
      href: `/admin/${segments[1]}`,
      label: sectionLabel,
      icon: null
    })
  }

  return (
    <nav className="flex mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-gray-900 flex items-center">
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-gray-900 flex items-center transition-colors"
              >
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}