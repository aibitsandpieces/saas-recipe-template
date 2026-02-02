# Multi-Tenant SaaS Foundation - Developer Briefing

**Project**: AI Potential Portal
**Framework**: Next.js 14 (App Router)
**Database**: Supabase (PostgreSQL)
**Authentication**: Clerk
**Status**: Production-Ready Foundation Complete

## 🎯 Overview

This briefing covers a complete multi-tenant SaaS foundation built on Next.js 14 with Clerk authentication and Supabase database. The system provides organization isolation, role-based access control, and enterprise-grade security patterns.

## 🏗️ Architecture Summary

### **Multi-Tenancy Model**
- **Organizations**: Complete data isolation between client companies
- **3-Role RBAC**: `platform_admin`, `org_admin`, `org_member`
- **Row Level Security**: JWT-based policies for performance optimization
- **User Lifecycle**: Automatic sync between Clerk and Supabase via webhooks

### **Tech Stack**
```
Frontend:   Next.js 14 (App Router) + React 19 + TypeScript
Backend:    Supabase (PostgreSQL + Row Level Security)
Auth:       Clerk (Third-party OIDC integration)
Styling:    Tailwind CSS + shadcn/ui components
Validation: Zod schemas
Forms:      React Hook Form
```

## 📋 Database Schema

### **Core Multi-Tenant Tables**

```sql
-- Organization isolation foundation
CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profiles (synced from Clerk)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Role definitions
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, -- 'platform_admin', 'org_admin', 'org_member'
  description text
);

-- User-role assignments (many-to-many with org scope)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id, organisation_id)
);
```

### **Business Data Pattern**
All business entities follow this pattern:
```sql
-- Example: Any business table
CREATE TABLE business_entity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- ... business fields ...
  user_id text NOT NULL,           -- Creator (Clerk user ID)
  organisation_id uuid REFERENCES organisations(id), -- Organization scope
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🔐 Security Model

### **Row Level Security Policies**

```sql
-- Organization isolation (standard pattern)
CREATE POLICY "org_members_see_org_data" ON business_entity FOR SELECT
TO authenticated USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

-- Platform admin override
CREATE POLICY "platform_admins_see_all_data" ON business_entity FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Org admin management
CREATE POLICY "org_admins_manage_org_data" ON business_entity FOR ALL
TO authenticated USING (
  (auth.jwt() ->> 'user_role') = 'org_admin'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);
```

### **JWT Claims Structure**
```json
{
  "role": "authenticated",              // PostgreSQL role (always authenticated)
  "user_role": "platform_admin",        // Application role
  "org_id": "550e8400-e29b-41d4-a716-446655440000"  // Organization UUID
}
```

## 🔑 Authentication Integration

### **Clerk Configuration**
**Session Token Custom Claims** (Clerk Dashboard → Sessions → Customize):
```json
{
  "role": "authenticated",
  "user_role": "{{user.public_metadata.role || 'org_member'}}",
  "org_id": "{{user.public_metadata.organisation_id}}"
}
```

### **Supabase Integration**
**Method**: Third-Party Auth via OIDC (NOT JWT signing keys)

```typescript
// lib/supabase.ts
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

## 🛠️ Code Patterns

### **User Context Validation**
```typescript
// lib/auth/user.ts - Always validate user context
export const requireUserWithOrg = async () => {
  const user = await getCurrentUser();
  if (!user || !user.organisationId) {
    throw new Error("User not found or not assigned to organization");
  }
  return { user, organisationId: user.organisationId };
};

// Usage in server actions
export const createBusinessEntity = async (entity: BusinessEntity) => {
  const { user, organisationId } = await requireUserWithOrg();

  const { data } = await supabase
    .from("business_table")
    .insert({
      ...entity,
      user_id: user.clerkId,
      organisation_id: organisationId  // Always include org scope
    });
};
```

### **Database Query Pattern**
```typescript
// ✅ CORRECT - Let RLS policies handle filtering
export const getBusinessEntities = async () => {
  const user = await getCurrentUser();
  if (!user?.organisationId) return [];

  // RLS policies automatically filter by org_id from JWT
  const { data } = await supabase
    .from("business_table")
    .select("*");

  return data || [];
};

// ❌ WRONG - Manual filtering bypasses RLS benefits
export const getBusinessEntitiesWrong = async () => {
  const { organisationId } = await requireUserWithOrg();

  const { data } = await supabase
    .from("business_table")
    .select("*")
    .eq("organisation_id", organisationId); // Redundant with RLS
};
```

## 🔄 User Lifecycle Management

### **Webhook Integration**
```typescript
// app/api/webhooks/clerk/route.ts
export async function POST(req: NextRequest) {
  // Handles: user.created, user.updated, user.deleted
  // Syncs user data between Clerk and Supabase
  // Updates public_metadata with role and org_id

  const clerk = await clerkClient();
  await clerk.users.updateUser(clerkUser.id, {
    publicMetadata: {
      organisation_id: orgId,
      role: "org_member"
    }
  });
}
```

## 📂 File Structure

### **Key Files**
```
lib/
├── auth/user.ts              # User context utilities
├── supabase.ts               # Supabase client with Clerk integration
├── supabase-admin.ts         # Service role client for webhooks
└── actions/
    └── [entity].actions.ts   # Server actions following org-scoped pattern

app/
├── api/webhooks/clerk/       # User lifecycle sync
└── [business-entities]/     # Organization-scoped pages

supabase/
└── migrations/
    └── 001_multi_tenant_schema.sql  # Complete database schema

types/
└── index.d.ts               # Business entity interfaces with organisation_id

middleware.ts                 # Clerk authentication + webhook exemption
```

### **Type Definitions**
```typescript
// types/index.d.ts
export interface BusinessEntity {
  id?: string;
  name: string;
  // ... business fields ...
  user_id?: string;
  organisation_id?: string;    // Required for multi-tenancy
  created_at?: string;
  updated_at?: string;
}
```

## 🔧 Environment Configuration

### **Required Environment Variables**
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Webhooks (for user sync)
CLERK_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

## 🚀 Setup Instructions

### **1. Database Setup**
```bash
# Apply the multi-tenant schema
# Option A: Via Supabase CLI
npx supabase db push

# Option B: Via Supabase Dashboard SQL Editor
# Copy/paste: supabase/migrations/001_multi_tenant_schema.sql
```

### **2. Clerk Configuration**
1. **Third-Party Auth**: Configure Supabase as third-party provider in Clerk
2. **Session Claims**: Add custom claims (see JWT structure above)
3. **Webhooks**: Create webhook endpoint pointing to `/api/webhooks/clerk`

### **3. Initial Data**
```sql
-- Create first organization
INSERT INTO organisations (name) VALUES ('Your Company');

-- Assign platform admin role to first user (after signup)
-- This happens automatically via webhook for subsequent users
```

## ⚠️ Critical Implementation Rules

### **DO:**
- ✅ Always include `organisation_id` in business entity types
- ✅ Use `requireUserWithOrg()` pattern in all server actions
- ✅ Let RLS policies handle data filtering (don't manually filter by org_id)
- ✅ Use Third-Party Auth for Clerk + Supabase integration
- ✅ Set JWT claims correctly: `role: "authenticated"` + `user_role: "app_role"`

### **DON'T:**
- ❌ Use JWT signing keys (deprecated approach)
- ❌ Hardcode organization IDs in queries
- ❌ Bypass RLS policies with service role queries in user-facing actions
- ❌ Use `role: "platform_admin"` as PostgreSQL role
- ❌ Forget to await `clerkClient()` before using `.users` methods

## 🧪 Testing Verification

### **Multi-Tenant Isolation Test**
```typescript
// Verify users only see their organization's data
// 1. Create test data for Org A and Org B
// 2. Sign in as user from Org A
// 3. Verify they only see Org A data
// 4. Sign in as user from Org B
// 5. Verify they only see Org B data
```

### **Role Permission Test**
```typescript
// Verify platform_admin can see all data
// Verify org_admin can manage their org
// Verify org_member has read-only access
```

## 📋 Common Customization Tasks

### **Adding New Business Entity**
1. **Create database table** with `organisation_id` column
2. **Add RLS policies** following the standard pattern
3. **Create TypeScript interface** with `organisation_id` field
4. **Implement server actions** using `requireUserWithOrg()`
5. **Build UI components** that respect organization scoping

### **Adding New Role**
1. **Insert role** into `roles` table
2. **Update RLS policies** to include new role logic
3. **Update Clerk metadata** assignment logic in webhooks
4. **Test permission boundaries**

## 🎯 Production Readiness

### **Security Checklist**
- ✅ RLS enabled on all tables
- ✅ JWT tokens properly validated
- ✅ No hardcoded credentials
- ✅ Webhook endpoints secured with signature verification
- ✅ Input validation with Zod schemas

### **Performance Considerations**
- ✅ Database indexes on foreign keys and query patterns
- ✅ JWT-based RLS (no database lookups in policies)
- ✅ Efficient query patterns in server actions

### **Monitoring & Maintenance**
- Monitor RLS policy performance
- Track authentication flow errors
- Backup strategy for user data and progress
- User role audit trails

---

## 📞 Support & Documentation

**Key Reference Files:**
- `docs/clerk-supabase-jwt-integration-2025.md` - Authentication integration guide
- `docs/testing-plan-multi-tenant-saas.md` - Comprehensive testing procedures
- `CLAUDE.md` - AI assistant guidance for maintaining patterns
- `docs/claude-working-notes.md` - Development history and decisions

**This foundation is production-ready and provides the security, scalability, and maintainability required for enterprise SaaS applications.**