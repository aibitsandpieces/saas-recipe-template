import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"
import BookWorkflowErrorBoundary from '@/components/error-boundaries/BookWorkflowErrorBoundary'

export default async function BookWorkflowsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Add authentication protection for book workflow pages
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BookWorkflowErrorBoundary>
        {children}
      </BookWorkflowErrorBoundary>
    </div>
  )
}