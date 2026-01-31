# Clerk + Supabase Integration Guide

## Overview

This document provides the definitive guide for integrating Clerk authentication with Supabase in this project. As of April 1st, 2025, **the JWT template approach has been deprecated** in favor of the native third-party auth integration.

## ⚠️ Important: What Changed

- **DEPRECATED**: Custom JWT templates and manual Authorization headers
- **CURRENT**: Native third-party auth provider integration
- **Benefits**: Simplified setup, better security, no token management complexity

## Required Setup Steps

### 1. Configure Supabase Dashboard

In your Supabase project dashboard:

1. Navigate to **Authentication > Providers**
2. Find **Third-party Auth** section
3. Add **Clerk** as a provider
4. Enter your Clerk domain: `https://your-clerk-domain.clerk.accounts.dev`

### 2. Configure Clerk Session Claims

In your Clerk Dashboard:

1. Go to **Sessions > Customize session token**
2. Add the following claims:

```json
{
  "role": "authenticated"
}
```

For custom roles (if needed):
```json
{
  "role": "{{user.public_metadata.role || 'authenticated'}}"
}
```

### 3. Correct Supabase Client Configuration

**✅ CORRECT (Current Approach)**

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export const createSupabaseClient = async () => {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        // Native third-party auth integration
        return await getToken();
      },
    }
  );
};
```

**❌ INCORRECT (Deprecated Approaches)**

```typescript
// Don't use manual Authorization headers
{
  global: {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
}

// Don't use custom JWT templates
{
  accessToken: async () => {
    return await getToken({ template: "supabase" }); // DEPRECATED
  },
}
```

### 4. RLS Policies

Your existing RLS policies should work with the native integration:

```sql
-- Example: Recipe ownership policy
CREATE POLICY "Users can create/modify only own recipes"
ON "public"."recipes"
TO "authenticated"
USING (((SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
WITH CHECK (((SELECT (auth.jwt() ->> 'sub'::text)) = user_id));
```

The `auth.jwt()` function works with Clerk session tokens in the native integration.

## Environment Variables

Ensure these are set correctly:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Troubleshooting Common Issues

### RLS Policy Violations

**Symptoms**: `Error: new row violates row-level security policy`

**Solutions**:
1. ✅ Verify Clerk is configured as third-party auth provider in Supabase
2. ✅ Confirm `role: "authenticated"` claim is in Clerk session tokens
3. ✅ Check that `user_id` field matches Clerk's user ID format
4. ✅ Ensure you're using the correct Supabase client configuration

### Authentication Not Working

**Symptoms**: User appears unauthenticated to Supabase

**Solutions**:
1. ✅ Check Supabase logs for JWT validation errors
2. ✅ Verify Clerk domain is correctly configured in Supabase
3. ✅ Ensure session token includes required claims

### Migration from JWT Template

If migrating from the old JWT template approach:

1. Remove any custom JWT templates from Clerk
2. Remove manual Authorization headers from Supabase client
3. Set up third-party auth provider in Supabase
4. Add role claim to Clerk session tokens
5. Update client code to use `accessToken` approach

## Testing the Integration

### 1. Verify Session Token

```typescript
// Add temporary debugging
const { getToken } = await auth();
const token = await getToken();
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log("Token claims:", payload);
  // Should include: sub, role, iss, etc.
}
```

### 2. Test Database Operations

```typescript
// Test that authenticated operations work
const supabase = await createSupabaseClient();
const { data, error } = await supabase
  .from("recipes")
  .insert({ name: "Test Recipe", user_id: userId });

// Should succeed without RLS violations
```

## Key Differences from Legacy Approach

| Legacy (Deprecated) | Current (Native Integration) |
|---------------------|------------------------------|
| Custom JWT templates | Native third-party auth |
| Manual token management | Automatic token handling |
| Complex configuration | Simple setup |
| Security concerns | Built-in security |

## 🔧 Project Setup & Deployment Troubleshooting

*This section contains lessons learned from real-world setup experiences to help avoid common pitfalls.*

### Dependency Version Compatibility Issues

**Problem**: Next.js 16+ requires updated Clerk packages. Older Clerk versions only support Next.js ≤15.2.3.

**Symptoms**:
```bash
npm error ERESOLVE could not resolve
peer next@"^13.5.7 || ^14.2.25 || ^15.2.3" from @clerk/nextjs@6.25.0
```

**Solution**: Update to compatible versions:
```json
{
  "@clerk/nextjs": "^6.37.1",
  "@clerk/backend": "^2.29.7"
}
```

**Prevention**: Always check Clerk's compatibility with your Next.js version before upgrading.

### Missing TypeScript Types

**Problem**: Deleted or missing `types/index.d.ts` file causes compilation failures.

**Symptoms**:
```bash
Type error: Cannot find module '@/types' or its corresponding type declarations.
```

**Solution**: Recreate the types file with proper interfaces:
```typescript
// types/index.d.ts
export interface Recipe {
  id?: string;
  created_at?: string;
  name: string;
  ingredients: string[];
  instructions: string;
  user_id?: string; // Optional - added by server actions
  // Extended properties from server actions
  userFirstName?: string;
  userImageUrl?: string;
  unlocked?: boolean;
}

export interface Comment {
  id?: string;
  created_at?: string;
  comment: string;
  user_id: string;
  recipe_id: string;
  // Extended properties from server actions
  userFirstName?: string;
  userImageUrl?: string;
}
```

**Key Insight**: Make `user_id` optional in client-side types since it's added by server actions, not forms.

### Development Server Lock Issues

**Problem**: Persistent "Unable to acquire lock" errors preventing development server startup.

**Symptoms**:
```bash
⨯ Unable to acquire lock at .next/dev/lock, is another instance of next dev running?
```

**Troubleshooting Steps**:
1. Kill all Node.js processes: `taskkill /F /IM node.exe`
2. Remove .next directory: `rmdir /S /Q .next`
3. Clear package lock: `del package-lock.json`
4. Fresh install: `npm install`

**Workaround**: Use production build for testing:
```bash
npm run build
npm start --port 3003
```

### Compilation-First Approach

**Lesson Learned**: Always test compilation before attempting to start servers.

**Best Practice**:
```bash
# 1. Test build first
npm run build

# 2. Fix any TypeScript/compilation errors
# 3. Then start development server
npm run dev
```

**Why**: Development server won't start with compilation errors, making debugging harder.

### Port Conflicts During Development

**Problem**: Multiple services trying to use the same port.

**Quick Solution**: Specify alternative ports:
```bash
# Development
npx next dev --port 3003

# Production
npx next start --port 3003
```

### Clean Dependency Installation

**When encountering weird dependency issues**:
```bash
# Nuclear approach - start fresh
rmdir /S /Q node_modules
del package-lock.json
npm install
```

**Alternative**: Use legacy peer deps flag:
```bash
npm install --legacy-peer-deps
```

## Resources

- [Clerk Supabase Integration Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Migration Guide](https://clerk.com/changelog/2025-03-31-supabase-integration)

## Support

For issues not covered in this guide:
1. Check Supabase auth logs
2. Verify Clerk session token claims
3. Review RLS policy configuration
4. Consult latest documentation (approaches may evolve)

---

**Last Updated**: January 31, 2026
**Status**: Current recommended approach
**Deprecation Notice**: JWT template approach deprecated April 2025