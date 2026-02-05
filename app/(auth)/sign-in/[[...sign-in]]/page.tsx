import { SignIn } from "@clerk/nextjs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignInPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const params = await searchParams;

  return (
    <main className="flex flex-col justify-center items-center space-y-4">
      {params.error === "invitation_required" && (
        <Alert className="max-w-md">
          <AlertDescription>
            Registration is invitation-only. Please contact your organization administrator
            to receive an invitation link, or sign in if you already have an account.
          </AlertDescription>
        </Alert>
      )}

      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
          },
        }}
      />
    </main>
  );
};

export default SignInPage;
