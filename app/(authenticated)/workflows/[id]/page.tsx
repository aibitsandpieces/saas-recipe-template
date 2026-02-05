import { getWorkflow } from "@/lib/actions/workflow.actions"
import { getWorkflowFiles } from "@/lib/actions/workflow.actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  User,
  BookOpen,
  Download,
  FileText,
  Calendar,
  FolderTree
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkflowDescriptionCard } from "@/components/workflow/WorkflowDescriptionCard"

interface WorkflowDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  // Await params for Next.js 15+ compatibility
  const { id } = await params
  const workflow = await getWorkflow(id)

  if (!workflow) {
    notFound()
  }

  // Only show published workflows to public users
  if (!workflow.is_published) {
    notFound()
  }

  const files = await getWorkflowFiles(workflow.id!)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {workflow.name}
              </h1>

              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                <FolderTree className="h-4 w-4" />
                <span>{workflow.categoryName}</span>
                <span>→</span>
                <Building2 className="h-4 w-4" />
                <span>{workflow.departmentName}</span>
              </nav>

              {/* Topic/Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {workflow.topic && workflow.topic !== workflow.name && (
                  <Badge variant="secondary">
                    {workflow.topic}
                  </Badge>
                )}
                {workflow.ai_mba && (
                  <Badge variant="outline">
                    {workflow.ai_mba}
                  </Badge>
                )}
                <Badge variant="default">
                  Published
                </Badge>
              </div>
            </div>

            {/* External Link */}
            {workflow.external_url && (
              <div className="flex-shrink-0 ml-4">
                <Button asChild>
                  <a
                    href={workflow.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Resource
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {workflow.description && (
              <WorkflowDescriptionCard description={workflow.description} />
            )}

            {/* Files */}
            {files && files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Attachments ({files.length})
                  </CardTitle>
                  <CardDescription>
                    Additional resources and documentation for this workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {file.display_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {file.file_size_bytes && (
                                <>
                                  {Math.round(file.file_size_bytes / 1024)}KB
                                  {file.content_type && ` • ${file.content_type}`}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> File downloads require authentication and are currently being implemented.
                      Check back soon for this functionality.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation to related workflows could go here */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Explore More Workflows
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Discover other workflows in the same category or department
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" asChild>
                      <Link href={`/workflows?category=${workflow.categoryId}`}>
                        Browse {workflow.categoryName}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/workflows?department=${workflow.department_id}`}>
                        Browse {workflow.departmentName}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category & Department */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Category</dt>
                  <dd className="text-sm text-gray-900">
                    <Link
                      href={`/workflows?category=${workflow.categoryId}`}
                      className="hover:text-blue-600"
                    >
                      {workflow.categoryName}
                    </Link>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Department</dt>
                  <dd className="text-sm text-gray-900">
                    <Link
                      href={`/workflows?department=${workflow.department_id}`}
                      className="hover:text-blue-600"
                    >
                      {workflow.departmentName}
                    </Link>
                  </dd>
                </div>

                {/* Source Information */}
                {workflow.source_author && (
                  <>
                    <Separator />
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Author
                      </dt>
                      <dd className="text-sm text-gray-900">{workflow.source_author}</dd>
                    </div>
                  </>
                )}

                {workflow.source_book && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Source
                    </dt>
                    <dd className="text-sm text-gray-900">{workflow.source_book}</dd>
                  </div>
                )}

                {/* Created Date */}
                {workflow.created_at && (
                  <>
                    <Separator />
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Added
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </>
                )}

                {/* File Count */}
                {files && files.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Attachments
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {files.length} file{files.length === 1 ? "" : "s"}
                    </dd>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {workflow.external_url && (
                    <Button className="w-full" asChild>
                      <a
                        href={workflow.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open External Resource
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/workflows">
                      Browse All Workflows
                    </Link>
                  </Button>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/workflows?q=${encodeURIComponent(workflow.source_author || workflow.categoryName || "")}`}>
                      <User className="h-4 w-4 mr-2" />
                      Find Similar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}