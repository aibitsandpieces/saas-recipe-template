"use client"

import { createContext, useContext, ReactNode } from "react"

export interface UserRoleContextType {
  roles: string[]
  isLoading: boolean
  isPlatformAdmin: boolean
  isOrgAdmin: boolean
  canDeleteCourses: boolean
  canDeleteModules: boolean
  canDeleteLessons: boolean
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined)

interface UserRoleProviderProps {
  children: ReactNode
  roles: string[]
}

export function UserRoleProvider({ children, roles }: UserRoleProviderProps) {
  const isPlatformAdmin = roles.includes("platform_admin")
  const isOrgAdmin = roles.includes("org_admin")

  const value: UserRoleContextType = {
    roles,
    isLoading: false,
    isPlatformAdmin,
    isOrgAdmin,
    canDeleteCourses: isPlatformAdmin, // Only platform admins
    canDeleteModules: isPlatformAdmin, // Only platform admins
    canDeleteLessons: isPlatformAdmin, // Only platform admins
  }

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole(): UserRoleContextType {
  const context = useContext(UserRoleContext)
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider")
  }
  return context
}