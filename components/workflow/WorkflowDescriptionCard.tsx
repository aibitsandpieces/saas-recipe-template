"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyButton } from "@/components/CopyButton"

interface WorkflowDescriptionCardProps {
  description: string
}

export function WorkflowDescriptionCard({ description }: WorkflowDescriptionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Description</CardTitle>
        <CopyButton
          text={description}
          ariaLabel="Copy workflow description"
          successMessage="Workflow content copied!"
          errorMessage="Failed to copy workflow content"
        />
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}