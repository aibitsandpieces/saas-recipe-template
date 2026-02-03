import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { NewLessonForm } from "./NewLessonForm"

interface NewLessonPageProps {
  params: Promise<{ id: string; moduleId: string }>
}

export default async function NewLessonPage({ params }: NewLessonPageProps) {
  const { id, moduleId } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/courses/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Lesson</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new lesson to this module
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <NewLessonForm courseId={id} moduleId={moduleId} />
      </div>
    </div>
  )
}