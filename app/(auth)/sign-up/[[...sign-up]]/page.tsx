import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";

interface SignUpPageProps {
  searchParams: Promise<{
    invitation_token?: string;
    __clerk_ticket?: string;
  }>;
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const params = await searchParams;

  // Check if user is accessing sign-up with an invitation
  // Clerk uses __clerk_ticket for invitation links
  const hasInvitation = params.invitation_token || params.__clerk_ticket;

  // If no invitation token, redirect to a blocked page or sign-in
  if (!hasInvitation) {
    // For security, only allow invitation-based registration
    redirect("/sign-in?error=invitation_required");
  }

  return (
    <main className="flex justify-center items-center">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
          },
        }}
        additionalSignUpFields={[
          {
            name: "first_name",
            label: "First Name",
            required: true,
            attributes: {
              placeholder: "Enter your first name",
            },
          },
          {
            name: "last_name",
            label: "Last Name",
            required: true,
            attributes: {
              placeholder: "Enter your last name",
            },
          },
        ]}
        afterSignUpUrl="/dashboard"
      />
    </main>
  );
};

export default SignUpPage;