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
import { BookOpen, Settings, ChevronDown, Users, GraduationCap, Menu, X } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useState } from "react"

const Navbar = () => {
  const { user, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if user is platform admin
  const isPlatformAdmin = user?.publicMetadata?.role === 'platform_admin'

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

            {/* Admin Dropdown - Only for Platform Admins */}
            {isPlatformAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/courses" className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Manage Courses</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/organizations" className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Manage Organizations</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Platform Admin Badge */}
            {isPlatformAdmin && (
              <Badge variant="secondary" className="text-xs">
                Platform Admin
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

              {/* Admin Links for Mobile */}
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
                      <Link href="/admin/organizations" className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Manage Organizations</span>
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </SignedIn>
    </header>
  )
}

export default Navbar
