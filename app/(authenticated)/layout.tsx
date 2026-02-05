import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"
import { AuthErrorWrapper } from "@/components/auth/AuthErrorWrapper"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthErrorWrapper>
        {children}
      </AuthErrorWrapper>
    </div>
  )
}