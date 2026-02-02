"use client"

import { useState } from "react"
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
  FolderTree,
  Building2,
  FileText,
  ArrowLeft,
  Download
} from "lucide-react"
import Link from "next/link"
import { CSVWorkflowRow, ImportPreviewResult, ImportError } from "@/types"
import { previewCSVImport, executeCSVImport } from "@/lib/actions/csv-import.actions"
import Papa from "papaparse"

export default function WorkflowImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVWorkflowRow[]>([])
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    // Validate file size (8MB limit)
    const maxSize = 8 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 8MB')
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
            const mappedData: CSVWorkflowRow[] = results.data.map((row: any) => ({
              ai_mba: row['ai mba'] || row['ai_mba'] || '',
              category: row['category'] || '',
              topic: row['topic'] || '',
              workflow: row['workflow'] || '',
              course: row['course'] || '',
              author: row['author'] || '',
              link: row['link'] || ''
            }))

            setCsvData(mappedData)

            // Get preview from server
            const previewResult = await previewCSVImport(mappedData)
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

  const executeImport = async () => {
    if (!file || !csvData.length || !preview?.isValid) return

    setIsImporting(true)
    setError(null)

    try {
      const result = await executeCSVImport(csvData, file.name)
      console.log('Import completed:', result)
      setImportComplete(true)
    } catch (importError) {
      console.error('Import error:', importError)
      setError(importError instanceof Error ? importError.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  if (importComplete) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/workflows">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Import Completed Successfully
            </CardTitle>
            <CardDescription>
              Your workflow data has been imported and is now available in the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {preview?.summary.categoriesToCreate.length || 0}
                </div>
                <div className="text-sm text-gray-500">Categories Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {preview?.summary.departmentsToCreate.length || 0}
                </div>
                <div className="text-sm text-gray-500">Departments Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {preview?.validRows || 0}
                </div>
                <div className="text-sm text-gray-500">Workflows Imported</div>
              </div>
            </div>
            <div className="flex justify-center space-x-2">
              <Button asChild>
                <Link href="/admin/workflows">View Workflows</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/workflows">Browse Public View</Link>
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
          <Link href="/admin/workflows">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Workflows</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file to bulk import workflows into the system
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
              <div><strong>ai mba</strong> - Category name (required)</div>
              <div><strong>category</strong> - Department name (required)</div>
              <div><strong>topic</strong> - Workflow name (required)</div>
              <div><strong>workflow</strong> - Content/description (optional)</div>
            </div>
            <div className="space-y-1">
              <div><strong>course</strong> - Source book (optional)</div>
              <div><strong>author</strong> - Source author (optional)</div>
              <div><strong>link</strong> - External URL (optional)</div>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm">
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
            Select a CSV file (max 8MB) to import workflows
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
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Preview Import
                  </>
                )}
              </Button>
              {preview && (
                <Button
                  onClick={executeImport}
                  disabled={!preview.isValid || isImporting}
                  variant={preview.isValid ? "default" : "secondary"}
                >
                  {isImporting ? "Importing..." : "Execute Import"}
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
                      {preview.summary.categoriesToCreate.length}
                    </div>
                    <div className="text-sm text-gray-500">New Categories</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {preview.summary.departmentsToCreate.length}
                    </div>
                    <div className="text-sm text-gray-500">New Departments</div>
                  </div>
                </div>

                {preview.summary.categoriesToCreate.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <FolderTree className="h-4 w-4 mr-2" />
                      Categories to Create
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.summary.categoriesToCreate.map((cat, index) => (
                        <Badge key={index} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {preview.summary.departmentsToCreate.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Departments to Create
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.summary.departmentsToCreate.slice(0, 10).map((dept, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                      {preview.summary.departmentsToCreate.length > 10 && (
                        <span className="text-sm text-gray-500">
                          ... and {preview.summary.departmentsToCreate.length - 10} more
                        </span>
                      )}
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
                          <TableHead>Category</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Workflow Name</TableHead>
                          <TableHead>Source Book</TableHead>
                          <TableHead>Author</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.sampleData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.ai_mba}</TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{row.topic}</TableCell>
                            <TableCell>{row.course || '-'}</TableCell>
                            <TableCell>{row.author || '-'}</TableCell>
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