# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack SaaS template called "Recipe Emporium" - a recipe management and sharing platform that demonstrates modern SaaS architecture. It's built with Next.js App Router, Supabase for data, and Clerk for authentication/billing.

## Development Commands

```bash
# Start development server with Turbopack (fast bundling)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Tech Stack

- **Next.js 16.1.6** with App Router and Server Components
- **React 19.0.0** with React Hook Form for forms
- **TypeScript 5.x** with strict configuration
- **Tailwind CSS 4.x** with PostCSS plugin for styling
- **shadcn/ui** component library (Radix UI + Tailwind)
- **Supabase** for PostgreSQL database and real-time features
- **Clerk** for authentication, user management, and subscription billing
- **Zod** for schema validation

## Architecture

### App Structure (Next.js App Router)
```
app/
├── (auth)/sign-in/     # Auth layout group - sign-in page
├── recipes/            # Recipe browsing and management
│   ├── [id]/          # Individual recipe detail page
│   └── new/           # Create new recipe page
├── my-cookbook/       # User's personal recipe collection
├── subscription/      # Pricing/subscription management
├── layout.tsx         # Root layout with ClerkProvider
└── page.tsx          # Homepage
```

### Data Layer
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Tables**: `recipes`, `comments`, `recipes_unlocked`
- **Authentication**: Clerk native third-party auth integration with Supabase RLS policies
- **Server Actions**: Located in `lib/actions/` for database operations

### Key Components
- **UI Components**: `components/ui/` contains shadcn/ui components
- **Business Components**: `components/` contains app-specific components
- **Server Actions**: `lib/actions/` contains Next.js server actions for data operations
- **Types**: `types/index.d.ts` defines Recipe and Comment interfaces

## Database Schema

Three main tables with RLS policies:

1. **recipes**: Recipe data with ingredients array, owned by users
2. **comments**: User comments on recipes with foreign key to recipes
3. **recipes_unlocked**: Tracks which users have paid to unlock premium recipes

RLS Policies ensure users can only modify their own data while viewing is controlled by subscription status.

## Authentication Flow

1. **Middleware**: `clerkMiddleware()` protects all routes except static files
2. **User Context**: Use `auth()` from `@clerk/nextjs/server` in Server Components
3. **Supabase Integration**: Clerk session tokens authenticate Supabase requests via native third-party auth
4. **Protected Actions**: Server actions check user authentication before database operations

## ⚠️ CRITICAL: Clerk + Supabase Integration

**ALWAYS REFER TO**:
- [`docs/clerk-supabase-jwt-integration-2025.md`](docs/clerk-supabase-jwt-integration-2025.md) - **Canonical JWT integration guide (2025)**
- [`docs/clerk-supabase-integration.md`](docs/clerk-supabase-integration.md) - Implementation details

**🚨 CRITICAL**: This project uses **Third-Party Auth with OIDC** (NOT JWT signing keys or shared secrets). The integration uses Clerk as the identity provider with Supabase verifying Clerk JWTs via public keys.

**❌ WRONG APPROACHES (Deprecated)**:
- Creating Supabase JWT signing keys for Clerk
- Sharing JWT secrets between Clerk and Supabase
- Using JWT templates with shared secrets

**✅ CORRECT APPROACH (2025)**:
- Clerk issues JWTs with custom claims
- Supabase trusts Clerk as Third-Party Auth provider
- Verification via OIDC discovery (no shared secrets)

**Common Issues Solved in the Guides**:
- RLS policy violations ("new row violates row-level security policy")
- Authentication not working with Supabase
- JWT verification configuration
- Proper Third-Party Auth setup

## Environment Variables Required

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Key Patterns

### Server Actions Pattern
Server actions in `lib/actions/` handle all database operations:
- `getRecipes()` - Fetch recipes with unlock status
- `getUserRecipes()` - Get user's own recipes
- `createRecipe()` - Create new recipe with validation
- `unlockRecipe()` - Handle recipe purchases

### Form Validation
Forms use React Hook Form + Zod:
```typescript
const form = useForm<z.infer<typeof recipeSchema>>({
  resolver: zodResolver(recipeSchema),
})
```

### Component Structure
- Server Components for data fetching
- Client Components for interactivity (marked with "use client")
- shadcn/ui components for consistent design system

## Subscription Model

- **Free Tier**: Limited recipe access
- **Paid Tier**: Unlimited recipe unlocks via Clerk's PricingTable
- **Unlock Tracking**: `recipes_unlocked` table stores individual purchases
- **Access Control**: Server actions check unlock status before revealing premium content

## Important Files

- `middleware.ts`: Clerk authentication middleware configuration
- `lib/supabase.ts`: Supabase client with Clerk token integration
- `supabase_schema.sql`: Complete database schema with RLS policies
- `components.json`: shadcn/ui configuration for consistent theming
- `app/layout.tsx`: Root layout with ClerkProvider and global styles