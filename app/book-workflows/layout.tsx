import BookWorkflowErrorBoundary from '@/components/error-boundaries/BookWorkflowErrorBoundary'

export default function BookWorkflowsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BookWorkflowErrorBoundary>
      {children}
    </BookWorkflowErrorBoundary>
  )
}