# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this multi-tenant SaaS template repository.

## Project Overview

This is a **production-ready multi-tenant SaaS template** that provides a complete foundation for building scalable SaaS applications. It demonstrates modern SaaS architecture with organization isolation, role-based access control, and enterprise-grade security patterns.

**Template Nature**: This includes a "Recipe Emporium" example to demonstrate the multi-tenant patterns, but it's designed to be customized for any business domain.

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
- **Supabase** for PostgreSQL database with RLS policies
- **Clerk** for authentication, user management, and subscription billing
- **Zod** for schema validation

## Multi-Tenant Architecture

### Core Database Schema
```
organisations    # Organization entities
├── users        # User profiles (synced from Clerk via webhooks)
├── roles        # RBAC role definitions (platform_admin, org_admin, org_member)
├── user_roles   # Role assignments
└── [business]   # Your business entities (organization-scoped)
```

### Example Implementation (Recipes)
- `recipes` - Business entity example (organization-scoped)
- `comments` - Related data example (organization-scoped)
- `recipes_unlocked` - Premium feature tracking (organization-scoped)

### App Structure (Next.js App Router)
```
app/
├── (auth)/sign-in/     # Authentication layout
├── [business]/         # Your business domain pages (currently "recipes")
│   ├── [id]/          # Individual entity detail page
│   └── new/           # Create new entity page
├── my-[domain]/       # User's personal collection
├── subscription/      # Pricing/subscription management
├── layout.tsx         # Root layout with ClerkProvider
└── page.tsx          # Homepage
```

## Key Patterns (Preserve These When Customizing)

### 1. Organization Scoping Pattern
**All business data must include organization_id and be filtered by RLS policies.**

```typescript
// ✅ Correct pattern - always include organization context
export const getBusinessEntities = async () => {
  const user = await getCurrentUser();
  if (!user?.organisationId) return [];

  // RLS policies automatically filter by org_id from JWT claims
  const { data } = await supabase
    .from("your_business_table")
    .select("*");
};

// ✅ Creating entities with organization scope
export const createBusinessEntity = async (entity: BusinessEntity) => {
  const { user, organisationId } = await requireUserWithOrg();

  const { data } = await supabase
    .from("your_business_table")
    .insert({
      ...entity,
      user_id: user.clerkId,
      organisation_id: organisationId  // Always include org scope
    });
};
```

### 2. User Context Validation Pattern
**Always validate user authentication and organization context in server actions.**

```typescript
import { getCurrentUser, requireUserWithOrg, requirePlatformAdmin } from "@/lib/auth/user";

// For organization-scoped operations
export const businessOperation = async () => {
  const { user, organisationId } = await requireUserWithOrg();
  // Proceed with organization context
};

// For platform admin operations
export const adminOperation = async () => {
  const user = await requirePlatformAdmin();
  // Platform admin can access cross-organization data
};
```

### 3. RLS Policy Pattern
**Use JWT claims for performance-optimized Row Level Security.**

```sql
-- Organization isolation for standard users
CREATE POLICY "users_see_own_org_data" ON your_table
FOR SELECT TO authenticated
USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

-- Platform admin override
CREATE POLICY "platform_admins_see_all_data" ON your_table
FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');
```

### 4. Authentication Integration
**Third-Party Auth with Clerk + Supabase (NOT JWT signing keys)**

```typescript
// lib/supabase.ts - Correct integration pattern
export const createSupabaseClient = async () => {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        return await getToken(); // Clerk handles JWT with custom claims
      },
    }
  );
};
```

## Critical Authentication Configuration

### Clerk Session Token Claims
**MUST be configured in Clerk Dashboard → Sessions → Customize:**
```json
{
  "role": "authenticated",
  "user_role": "{{user.public_metadata.role || 'org_member'}}",
  "org_id": "{{user.public_metadata.organisation_id}}"
}
```

### Supabase Third-Party Auth
**MUST use Third-Party Auth providers, NOT JWT signing keys:**
- Supabase trusts Clerk via OIDC discovery
- No shared secrets required
- Asymmetric JWT verification

## Environment Variables Required

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Webhooks (for user lifecycle sync)
CLERK_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

## Customization Guide

### Adapting for Your Business Domain

1. **Update Types** (`types/index.d.ts`):
   ```typescript
   // Replace Recipe/Comment with your entities
   export interface YourBusinessEntity {
     id: string;
     name: string;
     // your fields...
     user_id: string;           // Keep: user context
     organisation_id: string;   // Keep: organization scope
     created_at: string;        // Keep: timestamps
   }
   ```

2. **Update Database Schema** (`supabase/migrations/`):
   ```sql
   -- Replace recipes table with your business table
   CREATE TABLE your_business_table (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name VARCHAR NOT NULL,
     -- your fields...
     user_id UUID REFERENCES users(id) NOT NULL,
     organisation_id UUID REFERENCES organisations(id) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Apply RLS policies (copy pattern from recipes)
   ALTER TABLE your_business_table ENABLE ROW LEVEL SECURITY;
   ```

3. **Update Server Actions** (`lib/actions/`):
   - Copy the patterns from `recipe.actions.ts`
   - Replace business logic while preserving auth patterns
   - Keep organization scoping and user context validation

4. **Update UI Components**:
   - Replace pages in `app/recipes/` with `app/your-domain/`
   - Update components to match your business entities
   - Preserve authentication and organization context

## Important Files

- `lib/auth/user.ts`: User context and role management utilities
- `lib/supabase.ts`: Supabase client with Clerk token integration
- `supabase/migrations/001_multi_tenant_schema.sql`: Complete database schema
- `app/api/webhooks/clerk/route.ts`: User lifecycle sync via webhooks
- `middleware.ts`: Route protection and authentication middleware

## Documentation

- `docs/setup-guide.md`: Complete setup instructions for new projects
- `docs/clerk-supabase-jwt-integration-2025.md`: Authentication integration guide
- `docs/testing-plan-multi-tenant-saas.md`: Comprehensive testing procedures
- `docs/customization-guide.md`: Step-by-step customization instructions

## ⚠️ Critical Guidelines

### What to Preserve When Customizing
- **Organization scoping** in all database operations
- **User context validation** in all server actions
- **RLS policies** for data isolation
- **JWT claims structure** for authentication
- **Webhook user sync** for user lifecycle management

### What to Replace/Customize
- Business entity types and schemas
- UI components and pages
- Business logic in server actions
- Branding and visual design
- Feature-specific functionality

### Common Mistakes to Avoid
- ❌ Removing organization_id from database operations
- ❌ Bypassing user context validation in server actions
- ❌ Using shared JWT secrets (deprecated approach)
- ❌ Hardcoding organization IDs
- ❌ Modifying authentication patterns without testing

## Testing

This template includes comprehensive testing documentation:
- Authentication flow testing
- Multi-tenant isolation verification
- Role-based access control validation
- Security boundary testing
- Performance validation

See `docs/testing-plan-multi-tenant-saas.md` for full testing procedures.

## Template Philosophy

This template demonstrates proven patterns for multi-tenant SaaS applications through a working example. The recipe domain is intentionally simple to focus attention on the **architecture patterns** rather than complex business logic.

When customizing, preserve the security and multi-tenancy patterns while adapting the business domain to your needs.