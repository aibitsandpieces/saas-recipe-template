import { SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold">Portal</h1>
        <p className="text-xl text-muted-foreground">Welcome to your portal</p>
        <p className="text-muted-foreground">Access your training courses, AI workflows, and resources</p>
        <SignInButton mode="modal">
          <Button size="lg">Sign In</Button>
        </SignInButton>
      </div>
    </div>
  )
}
