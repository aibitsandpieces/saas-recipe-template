"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Users,
  Building2,
  BookOpen,
  ArrowLeft,
  Download,
  RefreshCw,
  Mail,
  UserPlus
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { CSVUserRow, UserImportPreviewResult, UserImportError } from "@/types"
import { previewUserImport, executeUserImport } from "@/lib/actions/user-management.actions"
import Papa from "papaparse"

export default function UserImportPage() {
  const { user } = useUser()

  // Check for platform admin role - redirect if not authorized
  useEffect(() => {
    if (user && user.publicMetadata?.role !== 'platform_admin') {
      redirect('/')
    }
  }, [user])

  // Show loading while checking auth
  if (!user || user.publicMetadata?.role !== 'platform_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    )
  }

  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVUserRow[]>([])
  const [preview, setPreview] = useState<UserImportPreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    // Validate file size (20MB limit)
    const maxSize = 20 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 20MB')
      return
    }

    setFile(selectedFile)
    setError(null)
    setPreview(null)
    setCsvData([])
  }

  const parseAndPreview = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Map CSV columns to our expected format
            const mappedData: CSVUserRow[] = results.data.map((row: any) => ({
              email: row['email'] || '',
              name: row['name'] || '',
              role: row['role'] || 'org_member',
              organisation: row['organisation'] || row['organization'] || '',
              courses: row['courses'] || ''
            }))

            setCsvData(mappedData)

            // Get preview from server
            const previewResult = await previewUserImport(mappedData)
            setPreview(previewResult)

          } catch (serverError) {
            console.error('Server preview error:', serverError)
            setError(serverError instanceof Error ? serverError.message : 'Failed to preview import')
          } finally {
            setIsLoading(false)
          }
        },
        error: (parseError) => {
          console.error('CSV parse error:', parseError)
          setError('Failed to parse CSV file. Please check the file format.')
          setIsLoading(false)
        }
      })
    } catch (err) {
      console.error('File processing error:', err)
      setError('Failed to process file')
      setIsLoading(false)
    }
  }

  const handleExecuteImport = async () => {
    if (!file || !csvData.length || !preview?.isValid) return

    setIsImporting(true)
    setError(null)

    try {
      const result = await executeUserImport(csvData, file.name)
      console.log('Import completed:', result)
      setImportResult(result)
      setImportComplete(true)

      toast({
        title: "Success",
        description: `Successfully processed ${result.successful_invitations} user invitations.`,
      })
    } catch (importError) {
      console.error('Import error:', importError)
      setError(importError instanceof Error ? importError.message : 'Import failed')

      toast({
        title: "Error",
        description: "Import failed. Please check the errors and try again.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `email,name,role,organisation,courses
john.doe@example.com,John Doe,org_member,Acme Corp,"Course 1, Course 2"
jane.smith@example.com,Jane Smith,org_admin,Acme Corp,
bob.wilson@company.com,Bob Wilson,org_member,Company Inc,"Course 3"`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (importComplete) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Import Completed
            </CardTitle>
            <CardDescription>
              Your user import has been processed. Review the results below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult?.successful_invitations || 0}
                </div>
                <div className="text-sm text-gray-500">Successful Invitations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult?.failed_invitations || 0}
                </div>
                <div className="text-sm text-gray-500">Failed Invitations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult?.individual_enrollments || 0}
                </div>
                <div className="text-sm text-gray-500">Course Enrollments</div>
              </div>
            </div>

            {importResult?.failed_invitations > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.failed_invitations} invitations failed to process.
                  Please check the error log for details and manually invite these users.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center space-x-2">
              <Button asChild>
                <Link href="/admin/users">View Users</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/users/import">Import More Users</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file to bulk invite users to the platform
        </p>
      </div>

      {/* CSV Format Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="h-5 w-5 mr-2" />
            CSV Format Requirements
          </CardTitle>
          <CardDescription>
            Your CSV file must have the following columns in order:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <div><strong>email</strong> - User email address (required, unique)</div>
              <div><strong>name</strong> - Full name of the user (required)</div>
              <div><strong>role</strong> - Either "org_admin" or "org_member" (required)</div>
            </div>
            <div className="space-y-1">
              <div><strong>organisation</strong> - Organization name (required, will be created if missing)</div>
              <div><strong>courses</strong> - Comma-separated course names for individual access (optional)</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Users will receive email invitations to join the platform</li>
              <li>• New organizations will be created automatically if they don't exist</li>
              <li>• Platform admin role required for creating organizations</li>
              <li>• Course names must match published courses exactly</li>
              <li>• Individual course access supplements organization-level enrollment</li>
            </ul>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Select a CSV file (max 20MB) to import users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            {file && (
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({Math.round(file.size / 1024)}KB)
                </span>
              </div>
            )}

            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={parseAndPreview}
                disabled={!file || isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Preview Import
                  </>
                )}
              </Button>
              {preview && (
                <Button
                  onClick={handleExecuteImport}
                  disabled={!preview.isValid || isImporting}
                  variant={preview.isValid ? "default" : "secondary"}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating {preview.summary.organisationsToCreate.length} organizations and inviting {preview.summary.usersToInvite} users...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {preview.summary.organisationsToCreate.length > 0 && `Create ${preview.summary.organisationsToCreate.length} Organizations & `}
                      Invite {preview.summary.usersToInvite} Users
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {preview.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              Import Preview
            </CardTitle>
            <CardDescription>
              {preview.isValid
                ? "Ready to import - no errors found"
                : `${preview.errors.length} errors must be fixed before import`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="sample">Sample Data</TabsTrigger>
                {preview.errors.length > 0 && (
                  <TabsTrigger value="errors" className="text-red-600">
                    Errors ({preview.errors.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{preview.totalRows}</div>
                    <div className="text-sm text-gray-500">Total Rows</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{preview.validRows}</div>
                    <div className="text-sm text-gray-500">Valid Rows</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {preview.summary.usersToInvite}
                    </div>
                    <div className="text-sm text-gray-500">Users to Invite</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {preview.summary.coursesFound.length}
                    </div>
                    <div className="text-sm text-gray-500">Courses Referenced</div>
                  </div>
                </div>

{preview.summary.organisationsToCreate.length > 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>New Organizations:</strong> The following organizations will be created during import:
                      <ul className="list-disc list-inside mt-1">
                        {preview.summary.organisationsToCreate.map(org => (
                          <li key={org}>{org}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {preview.summary.organisationsFound.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Organizations Found
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.summary.organisationsFound.map((org, index) => (
                        <Badge key={index} variant="outline">{org}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {preview.summary.coursesFound.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Courses for Individual Access
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.summary.coursesFound.slice(0, 10).map((course, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {course}
                        </Badge>
                      ))}
                      {preview.summary.coursesFound.length > 10 && (
                        <span className="text-sm text-gray-500">
                          ... and {preview.summary.coursesFound.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {Object.keys(preview.summary.rolesAssigned).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Role Distribution
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(preview.summary.rolesAssigned).map(([role, count]) => (
                        <div key={role} className="flex justify-between text-sm">
                          <span className="capitalize">{role.replace('_', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sample">
                <div>
                  <h4 className="font-medium mb-2">Sample Data (First 5 Rows)</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Courses</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.sampleData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>
                              <Badge variant={row.role === 'org_admin' ? 'default' : 'secondary'}>
                                {row.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.organisation}</TableCell>
                            <TableCell>{row.courses || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {preview.errors.length > 0 && (
                <TabsContent value="errors">
                  <div>
                    <h4 className="font-medium mb-2">Validation Errors</h4>
                    <div className="space-y-2">
                      {preview.errors.slice(0, 20).map((error, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
                          <div className="text-sm">
                            <strong>Row {error.row}</strong>
                            {error.field && <span> - Field: {error.field}</span>}
                          </div>
                          <div className="text-sm text-red-600">{error.message}</div>
                          {error.value && (
                            <div className="text-xs text-gray-600 mt-1">
                              Value: "{error.value}"
                            </div>
                          )}
                        </div>
                      ))}
                      {preview.errors.length > 20 && (
                        <div className="text-sm text-gray-500">
                          ... and {preview.errors.length - 20} more errors
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}