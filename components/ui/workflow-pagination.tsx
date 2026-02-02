"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface WorkflowPaginationProps {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
  itemsPerPage: number
}

export function WorkflowPagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  itemsPerPage
}: WorkflowPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `?${params.toString()}`
  }

  const handlePageChange = (page: number) => {
    router.push(createPageURL(page))
  }

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  // Generate page numbers to show
  const getVisiblePageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 7 // Show up to 7 page numbers

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Smart pagination with ellipsis
      pages.push(1)

      if (currentPage <= 4) {
        // Near beginning
        for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
          pages.push(i)
        }
        if (totalPages > 5) {
          pages.push('ellipsis1')
        }
      } else if (currentPage >= totalPages - 3) {
        // Near end
        if (totalPages > 5) {
          pages.push('ellipsis1')
        }
        for (let i = Math.max(totalPages - 4, 2); i < totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In middle
        pages.push('ellipsis1')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis2')
      }

      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-2 py-3 text-sm text-gray-500">
        <div>
          Showing {startItem} to {endItem} of {totalCount} results
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
      {/* Mobile pagination info */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Previous
        </button>
        <div className="flex items-center">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Next
        </button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div>
          <Pagination>
            <PaginationContent>
              {/* Previous button */}
              <PaginationItem>
                <PaginationPrevious
                  href={hasPreviousPage ? createPageURL(currentPage - 1) : undefined}
                  onClick={(e) => {
                    if (!hasPreviousPage) {
                      e.preventDefault()
                      return
                    }
                    e.preventDefault()
                    handlePageChange(currentPage - 1)
                  }}
                  className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* Page numbers */}
              {getVisiblePageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {typeof page === 'string' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href={createPageURL(page)}
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(page)
                      }}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              {/* Next button */}
              <PaginationItem>
                <PaginationNext
                  href={hasNextPage ? createPageURL(currentPage + 1) : undefined}
                  onClick={(e) => {
                    if (!hasNextPage) {
                      e.preventDefault()
                      return
                    }
                    e.preventDefault()
                    handlePageChange(currentPage + 1)
                  }}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}