"use client"

import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Menu, X, ChevronDown } from "lucide-react"
import { useActiveNavigation } from "@/lib/hooks/useActiveNavigation"

const Navbar = () => {
  const { user, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { getLinkStyles } = useActiveNavigation()

  // Check user roles for admin access
  const userRole = user?.publicMetadata?.role
  const isAdmin = userRole === 'platform_admin' || userRole === 'org_admin'
  const isPlatformAdmin = userRole === 'platform_admin'
  const isOrgAdmin = userRole === 'org_admin'

  return (
    <header className="border-b bg-sage-deep">
      <div className="flex justify-between items-center p-4 gap-4 h-16 max-w-7xl mx-auto">
        {/* Logo - Unbranded "Portal" */}
        <Link
          href="/dashboard"
          className="text-xl sm:text-2xl font-bold text-warm-white hover:text-amber transition-colors"
        >
          Portal
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <SignedIn>
            {/* Main Navigation Links */}
            <Link
              href="/courses"
              className={getLinkStyles("/courses", "transition-colors")}
            >
              Courses
            </Link>

            <Link
              href="/workflows"
              className={getLinkStyles("/workflows", "transition-colors")}
            >
              Workflows
            </Link>

            <Link
              href="/book-workflows"
              className={getLinkStyles("/book-workflows", "transition-colors")}
            >
              Book Workflows
            </Link>

            {/* Role-based Admin Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-warm-white hover:text-amber">
                    <span>Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Platform Admin - Gets all 6 items */}
                  {isPlatformAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/courses">Courses</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/workflows">Workflows</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/book-workflows">Book Workflows</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users">Users</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/organizations">Organisations</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/reports">Reports</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Org Admin - Gets only 2 items */}
                  {isOrgAdmin && !isPlatformAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users">Users</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/reports">Reports</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SignedIn>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <SignedIn>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SignedIn>

          {/* Auth Buttons */}
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <SignedIn>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-sage bg-sage-deep">
            <nav className="p-4 space-y-2">
              {/* Main Navigation Links */}
              <Button
                variant="ghost"
                className="w-full justify-start text-warm-white hover:text-amber"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/courses">Courses</Link>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start text-warm-white hover:text-amber"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/workflows">Workflows</Link>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start text-warm-white hover:text-amber"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/book-workflows">Book Workflows</Link>
              </Button>

              {/* Admin Section for Mobile */}
              {isAdmin && (
                <div className="border-t border-sage my-2 pt-2">
                  <p className="text-xs text-warm-white mb-2 px-3">Admin</p>

                  {/* Platform Admin - Gets all 6 items */}
                  {isPlatformAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/courses">Courses</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/workflows">Workflows</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/book-workflows">Book Workflows</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/users">Users</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/organizations">Organisations</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/reports">Reports</Link>
                      </Button>
                    </>
                  )}

                  {/* Org Admin - Gets only 2 items */}
                  {isOrgAdmin && !isPlatformAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/users">Users</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-warm-white hover:text-amber"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/reports">Reports</Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </SignedIn>
    </header>
  )
}

export default Navbar