"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle, CheckCircle, Download, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Papa from "papaparse"
import Link from "next/link"
import { previewBookWorkflowCSV, executeBookWorkflowCSVImport } from "@/lib/actions/book-workflow.actions"
import { CSVBookWorkflowRow, BookWorkflowImportPreview, BookWorkflowImportLog } from "@/types"

type ImportStage = "upload" | "preview" | "importing" | "success" | "error"

interface ImportState {
  stage: ImportStage
  file: File | null
  csvData: CSVBookWorkflowRow[]
  preview: BookWorkflowImportPreview | null
  result: BookWorkflowImportLog | null
  error: string | null
}

const SAMPLE_CSV = `department,category,book,author,workflow,activity_type,problem_goal
Sales,Prospecting & Lead Generation,SPIN Selling,Neil Rackham,Need-Payoff Proposition Builder,Create,Grow
Marketing,Content Strategy,Content Inc,Joe Pulizzi,Blog Post Generator,Create,Understand
HR / People,Performance Management,Radical Candor,Kim Scott,Feedback Conversation Guide,Create,Lead
Strategy,Corporate Vision,Good to Great,Jim Collins,Hedgehog Concept Workshop,Workshop,Strategise
Operations,Process Improvement,The Lean Startup,Eric Ries,Build-Measure-Learn Cycle,Plan,Innovate`

export default function ImportBookWorkflowsPage() {
  const [importState, setImportState] = useState<ImportState>({
    stage: "upload",
    file: null,
    csvData: [],
    preview: null,
    result: null,
    error: null
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setImportState(prev => ({ ...prev, stage: "upload", file, error: null }))

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        transform: (value) => value.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            setImportState(prev => ({
              ...prev,
              error: `CSV parsing error: ${results.errors[0].message}`,
              stage: "error"
            }))
            return
          }

          const csvData = results.data as CSVBookWorkflowRow[]
          setImportState(prev => ({
            ...prev,
            csvData,
            stage: "upload"
          }))
        },
        error: (error) => {
          setImportState(prev => ({
            ...prev,
            error: `Failed to parse CSV: ${error.message}`,
            stage: "error"
          }))
        }
      })
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    maxSize: 20 * 1024 * 1024 // 20MB
  })

  const handlePreview = async () => {
    if (!importState.csvData.length) return

    setImportState(prev => ({ ...prev, stage: "preview", error: null }))

    try {
      const preview = await previewBookWorkflowCSV(importState.csvData)
      setImportState(prev => ({ ...prev, preview }))
    } catch (error: any) {
      setImportState(prev => ({
        ...prev,
        error: error.message || "Failed to preview CSV",
        stage: "error"
      }))
    }
  }

  const handleImport = async () => {
    if (!importState.csvData.length || !importState.file) return

    setImportState(prev => ({ ...prev, stage: "importing", error: null }))

    try {
      const result = await executeBookWorkflowCSVImport(importState.csvData, importState.file.name)
      setImportState(prev => ({ ...prev, result, stage: "success" }))
    } catch (error: any) {
      setImportState(prev => ({
        ...prev,
        error: error.message || "Failed to import CSV",
        stage: "error"
      }))
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'book_workflows_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setImportState({
      stage: "upload",
      file: null,
      csvData: [],
      preview: null,
      result: null,
      error: null
    })
  }

  if (importState.stage === "success" && importState.result) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/book-workflows">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Book Workflows Admin
              </Button>
            </Link>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-6 w-6" />
                Import Successful
              </CardTitle>
              <CardDescription className="text-green-700">
                Your book workflows have been imported successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-green-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{importState.result.workflows_created}</div>
                  <div className="text-sm">Workflows Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{importState.result.books_created}</div>
                  <div className="text-sm">Books Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{importState.result.categories_created}</div>
                  <div className="text-sm">Categories Created</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <strong>File:</strong> {importState.result.file_name}
                </div>
                <div className="text-sm">
                  <strong>Total Rows:</strong> {importState.result.total_rows}
                </div>
                <div className="text-sm">
                  <strong>Successful:</strong> {importState.result.successful_rows}
                </div>
                {importState.result.failed_rows > 0 && (
                  <div className="text-sm">
                    <strong>Failed:</strong> {importState.result.failed_rows}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-4">
                <Link href="/book-workflows">
                  <Button>
                    View Book Workflows
                  </Button>
                </Link>
                <Button variant="outline" onClick={reset}>
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (importState.stage === "error") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/book-workflows">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Book Workflows Admin
              </Button>
            </Link>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {importState.error}
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button onClick={reset}>
              Try Again
            </Button>
            <Link href="/admin/book-workflows">
              <Button variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (importState.stage === "importing") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importing Book Workflows...</CardTitle>
              <CardDescription>
                Please wait while we process your CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={100} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Importing {importState.csvData.length} workflows...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/book-workflows">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Book Workflows Admin
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Import Book Workflows</h1>
          <p className="text-gray-600 mt-2">
            Upload a CSV file to import book workflows into the system.
          </p>
        </div>

        {/* File Upload */}
        {importState.stage === "upload" && (
          <div className="space-y-6">
            {/* Sample CSV */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  CSV Format
                </CardTitle>
                <CardDescription>
                  Download a sample CSV file to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">
                    <strong>Required columns:</strong> department, category, book, author, workflow, activity_type, problem_goal
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Activity Types:</strong> Create, Assess, Plan, Workshop</div>
                    <div><strong>Problem/Goals:</strong> Grow, Optimise, Lead, Strategise, Innovate, Understand</div>
                    <div><strong>Departments:</strong> Must match existing: Sales, Marketing, HR / People, Finance, Operations, Strategy, Leadership</div>
                  </div>
                  <Button variant="outline" onClick={downloadSample}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Select or drag and drop your book workflows CSV file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the file here...</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        Drag and drop a CSV file here, or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Maximum file size: 20MB
                      </p>
                    </div>
                  )}
                </div>

                {importState.file && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{importState.file.name}</div>
                          <div className="text-sm text-gray-600">
                            {(importState.file.size / 1024).toFixed(1)} KB • {importState.csvData.length} rows
                          </div>
                        </div>
                      </div>
                      <Button onClick={handlePreview}>
                        Preview Import
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Results */}
        {importState.stage === "preview" && importState.preview && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importState.preview.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Preview
                </CardTitle>
                <CardDescription>
                  Review the import preview before proceeding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="sample">Sample Data</TabsTrigger>
                    {importState.preview.errors.length > 0 && (
                      <TabsTrigger value="errors">
                        Errors ({importState.preview.errors.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{importState.preview.totalRows}</div>
                        <div className="text-sm text-gray-600">Total Rows</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{importState.preview.validRows}</div>
                        <div className="text-sm text-gray-600">Valid Rows</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-700">{importState.preview.errors.length}</div>
                        <div className="text-sm text-gray-600">Errors</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Categories to Create</h4>
                        <div className="flex gap-2 flex-wrap">
                          {importState.preview.summary.categoriesToCreate.map(cat => (
                            <Badge key={cat} variant="secondary">{cat}</Badge>
                          ))}
                          {importState.preview.summary.categoriesToCreate.length === 0 && (
                            <span className="text-sm text-gray-600">None</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Books to Create</h4>
                        <div className="flex gap-2 flex-wrap">
                          {importState.preview.summary.booksToCreate.slice(0, 10).map(book => (
                            <Badge key={book} variant="secondary">{book}</Badge>
                          ))}
                          {importState.preview.summary.booksToCreate.length > 10 && (
                            <Badge variant="outline">
                              +{importState.preview.summary.booksToCreate.length - 10} more
                            </Badge>
                          )}
                          {importState.preview.summary.booksToCreate.length === 0 && (
                            <span className="text-sm text-gray-600">None</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Workflows to Create</h4>
                        <div className="text-2xl font-bold text-blue-600">
                          {importState.preview.summary.workflowsToCreate}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="sample">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-3 py-2 text-left">Department</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Category</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Book</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Author</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Workflow</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Activity</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Goal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importState.preview.sampleData.map((row, index) => (
                            <tr key={index}>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.department}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.category}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.book}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.author}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.workflow}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.activity_type}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.problem_goal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {importState.preview.errors.length > 0 && (
                    <TabsContent value="errors">
                      <div className="space-y-2">
                        {importState.preview.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Row {error.row}: {error.message}
                              {error.field && ` (Field: ${error.field})`}
                              {error.value && ` (Value: "${error.value}")`}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={handleImport}
                    disabled={!importState.preview.isValid}
                    className="flex-1"
                  >
                    {importState.preview.isValid ? "Execute Import" : "Fix Errors First"}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Upload New File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}