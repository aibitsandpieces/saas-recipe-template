"use client"

import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { BookOpen, Settings, ChevronDown, Users, GraduationCap, Menu, X, Network, Book, UserCheck, BarChart3 } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useState } from "react"

const Navbar = () => {
  const { user, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check user roles for admin access
  const userRole = user?.publicMetadata?.role
  const isAdmin = userRole === 'platform_admin' || userRole === 'org_admin'
  const isPlatformAdmin = userRole === 'platform_admin'

  return (
    <header className="border-b border-border bg-background">
      <div className="flex justify-between items-center p-4 gap-4 h-16 max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl sm:text-2xl font-bold text-foreground hover:text-primary transition-colors"
        >
          AI Potential Portal
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <SignedIn>
            {/* Courses Link */}
            <Button variant="ghost" asChild>
              <Link href="/courses" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Courses</span>
              </Link>
            </Button>

            {/* Workflows Link */}
            <Button variant="ghost" asChild>
              <Link href="/workflows" className="flex items-center space-x-2">
                <Network className="h-4 w-4" />
                <span>Workflows</span>
              </Link>
            </Button>

<<<<<<< HEAD
            {/* Admin Dropdown - Only for Platform Admins */}
            {isPlatformAdmin && (
=======
            {/* Book Workflows Link */}
            <Button variant="ghost" asChild>
              <Link href="/book-workflows" className="flex items-center space-x-2">
                <Book className="h-4 w-4" />
                <span>Book Workflows</span>
              </Link>
            </Button>

            {/* Admin Dropdown - For Both Admin Roles */}
            {isAdmin && (
>>>>>>> 7cab6c6 (quick update)
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Core admin items available to all admin roles */}
                  <DropdownMenuItem asChild>
                    <Link href="/admin/courses" className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Manage Courses</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/workflows" className="flex items-center space-x-2">
                      <Network className="h-4 w-4" />
                      <span>Manage Workflows</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
<<<<<<< HEAD
                    <Link href="/admin/organizations" className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Manage Organizations</span>
=======
                    <Link href="/admin/book-workflows" className="flex items-center space-x-2">
                      <Book className="h-4 w-4" />
                      <span>Manage Book Workflows</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4" />
                      <span>Manage Users</span>
>>>>>>> 7cab6c6 (quick update)
                    </Link>
                  </DropdownMenuItem>

                  {/* Platform admin exclusive items */}
                  {isPlatformAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin/organizations" className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Manage Organizations</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/reports" className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4" />
                          <span>Reports</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Admin Role Badge */}
            {isPlatformAdmin && (
              <Badge variant="secondary" className="text-xs">
                Platform Admin
              </Badge>
            )}
            {userRole === 'org_admin' && (
              <Badge variant="outline" className="text-xs">
                Org Admin
              </Badge>
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
            <SignInButton>
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
          <div className="md:hidden border-t border-border bg-card">
            <nav className="p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/courses" className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/workflows" className="flex items-center space-x-2">
                  <Network className="h-4 w-4" />
                  <span>Workflows</span>
                </Link>
              </Button>

              {/* Admin Links for Mobile */}
<<<<<<< HEAD
              {isPlatformAdmin && (
                <>
                  <div className="border-t border-border my-2 pt-2">
                    <p className="text-xs text-muted-foreground mb-2 px-3">Admin</p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/admin/courses" className="flex items-center space-x-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>Manage Courses</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/admin/workflows" className="flex items-center space-x-2">
                        <Network className="h-4 w-4" />
                        <span>Manage Workflows</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/admin/organizations" className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Manage Organizations</span>
                      </Link>
                    </Button>
                  </div>
                </>
=======
              {isAdmin && (
                <div className="border-t border-border my-2 pt-2">
                  <p className="text-xs text-muted-foreground mb-2 px-3">Admin</p>

                  {/* Core admin items available to all admin roles */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/admin/courses" className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Manage Courses</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/admin/workflows" className="flex items-center space-x-2">
                      <Network className="h-4 w-4" />
                      <span>Manage Workflows</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/admin/book-workflows" className="flex items-center space-x-2">
                      <Book className="h-4 w-4" />
                      <span>Manage Book Workflows</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/admin/users" className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4" />
                      <span>Manage Users</span>
                    </Link>
                  </Button>

                  {/* Platform admin exclusive items */}
                  {isPlatformAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/organizations" className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Manage Organizations</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin/reports" className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4" />
                          <span>Reports</span>
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
>>>>>>> 7cab6c6 (quick update)
              )}
            </nav>
          </div>
        )}
      </SignedIn>
    </header>
  )
}

export default Navbar
