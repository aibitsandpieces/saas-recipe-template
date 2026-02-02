"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrganizationPicker } from "@/components/admin/OrganizationPicker"
import {
  Users,
  UserPlus,
  Mail,
  MoreHorizontal,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  ShieldCheck,
  Download,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  getUsersForAdmin,
  inviteUser,
  resendInvitation,
  updateUserRole,
  getInvitations
} from "@/lib/actions/user-management.actions"
import {
  UserWithRole,
  UserInvitation,
  UserSearchResult,
  UserSearchFilters
} from "@/types"

export default function UserManagementPage() {
  const { user } = useUser()

  // Check for admin role - redirect if not authorized
  useEffect(() => {
    if (user && user.publicMetadata?.role !== 'org_admin' && user.publicMetadata?.role !== 'platform_admin') {
      redirect('/')
    }
  }, [user])

  // Show loading while checking auth
  if (!user || (user.publicMetadata?.role !== 'org_admin' && user.publicMetadata?.role !== 'platform_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    )
  }

  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<UserSearchFilters>({
    query: '',
    page: 1,
    limit: 20
  })
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [activeTab, setActiveTab] = useState("users")
  const { toast } = useToast()

  // Load data
  useEffect(() => {
    loadData()
  }, [filters, activeTab])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const result = await getUsersForAdmin(filters)
      setSearchResult(result)
    } catch (error) {
      console.error('Failed to load user data:', error)
      toast({
        title: "Error",
        description: "Failed to load user data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query, page: 1 }))
  }

  const handleInviteUser = async (formData: FormData) => {
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const role = formData.get("role") as "org_admin" | "org_member"
    const organisationId = formData.get("organisationId") as string

    if (!email || !name || !role || !organisationId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInviting(true)
      await inviteUser({
        email,
        name,
        role,
        organisationId,
        courseIds: [] // TODO: Add course selection
      })

      toast({
        title: "Success",
        description: "User invitation sent successfully.",
      })

      setIsInviteDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Failed to invite user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId)
      toast({
        title: "Success",
        description: "Invitation resent successfully.",
      })
      loadData()
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend invitation.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: "org_admin" | "org_member") => {
    try {
      await updateUserRole(userId, newRole)
      toast({
        title: "Success",
        description: "User role updated successfully.",
      })
      loadData()
    } catch (error) {
      console.error('Failed to update user role:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-700 bg-yellow-100"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'accepted':
        return <Badge variant="default" className="text-green-700 bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>
      case 'expired':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'platform_admin':
        return <Badge variant="default" className="text-purple-700 bg-purple-100"><Shield className="h-3 w-3 mr-1" />Platform Admin</Badge>
      case 'org_admin':
        return <Badge variant="default" className="text-blue-700 bg-blue-100"><ShieldCheck className="h-3 w-3 mr-1" />Org Admin</Badge>
      case 'org_member':
        return <Badge variant="secondary">Member</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  if (isLoading && !searchResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage users, invitations, and access permissions
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading user data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, invitations, and access permissions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href="/admin/users/import">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import Users
            </Link>
          </Button>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                handleInviteUser(formData)
              }}>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new user to join the platform.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select name="role" required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org_member">Member</SelectItem>
                        <SelectItem value="org_admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      Organization
                    </Label>
                    <div className="col-span-3">
                      <OrganizationPicker
                        name="organisationId"
                        required
                        placeholder="Select organization"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Inviting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {searchResult && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{searchResult.totalUserCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {searchResult.invitations.filter(inv => inv.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {searchResult.users.reduce((acc, user) => acc + (user.courseEnrollments?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {searchResult.users.filter(user => user.role?.includes('admin')).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-2">
            <Input
              placeholder="Search users by name or email..."
              value={filters.query}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users ({searchResult?.totalUserCount || 0})</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({searchResult?.totalInvitationCount || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>
                Users who have signed up and are active in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResult?.users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Course Access</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResult?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name || 'No name'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.organisationName || 'No organization'}</TableCell>
                        <TableCell>{getRoleBadge(user.role || 'org_member')}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.courseEnrollments?.length || 0} individual enrollments
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleUpdateUserRole(user.id, user.role === 'org_admin' ? 'org_member' : 'org_admin')}
                              >
                                {user.role === 'org_admin' ? 'Make Member' : 'Make Admin'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Invitations</CardTitle>
              <CardDescription>
                Pending and processed invitations sent to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResult?.invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No invitations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResult?.invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="font-medium">{invitation.email}</div>
                          {invitation.courses.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {invitation.courses.length} course(s) assigned
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{invitation.organisationName}</TableCell>
                        <TableCell>{getRoleBadge(invitation.role_name)}</TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>
                          {invitation.invited_at ? new Date(invitation.invited_at).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'No expiry'}
                        </TableCell>
                        <TableCell className="text-right">
                          {invitation.status === 'pending' || invitation.status === 'expired' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => invitation.id && handleResendInvitation(invitation.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {searchResult && searchResult.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((searchResult.pagination.page - 1) * searchResult.pagination.limit) + 1} to {Math.min(
              searchResult.pagination.page * searchResult.pagination.limit,
              searchResult.totalUserCount + searchResult.totalInvitationCount
            )} of {searchResult.totalUserCount + searchResult.totalInvitationCount} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!searchResult.pagination.hasPreviousPage}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!searchResult.pagination.hasNextPage}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}