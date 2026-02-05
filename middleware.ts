import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk"
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const { pathname } = request.nextUrl;

  // Redirect signed-in users from "/" to "/dashboard"
  if (isSignedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Don't protect public routes
  if (isPublicRoute(request)) {
    return;
  }

  // For protected routes, use auth.protect()
  auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
