# Multi-Tenant Setup Guide

This guide walks you through completing the multi-tenant database schema and user management implementation.

## Prerequisites

- Existing Clerk + Supabase integration (see `docs/clerk-supabase-integration.md`)
- Access to Supabase dashboard
- Access to Clerk dashboard
- Completed code implementation (already done)

## Step 1: Configure Environment Variables

Update your `.env.local` file with the required new environment variables:

```bash
# Service role key for admin operations (webhooks, bypassing RLS)
# Get from: https://supabase.com/dashboard/project/[your-project]/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Clerk webhook signing secret
# You'll get this when creating the webhook endpoint in Step 4
CLERK_WEBHOOK_SECRET=your_webhook_secret_here
```

### Getting the Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (NOT the anon key)
4. Add it to your `.env.local` file

⚠️ **WARNING**: The service role key bypasses all RLS policies. Never expose it to the browser or client-side code.

## Step 2: Run Database Migration

Execute the migration to create the multi-tenant schema:

```bash
# If using Supabase CLI (recommended)
supabase db push

# Or run the migration manually in Supabase SQL Editor
# Copy and paste the contents of: supabase/migrations/001_multi_tenant_schema.sql
```

This migration will:
- Create `organisations`, `users`, `roles`, and `user_roles` tables
- Add `organisation_id` columns to existing tables
- Set up RLS policies using JWT claims for performance
- Seed the three roles: `platform_admin`, `org_admin`, `org_member`

## Step 3: Configure Clerk Session Token

Add custom claims to the Clerk session token to enable JWT-based RLS policies.

### 3.1 Access Session Configuration

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Sessions** → **Customize session token**

### 3.2 Add Custom Claims

Add the following JSON configuration:

```json
{
  "role": "{{user.public_metadata.role || 'org_member'}}",
  "org_id": "{{user.public_metadata.organisation_id}}"
}
```

This configuration:
- Adds the user's role to the JWT token (defaults to 'org_member')
- Adds the user's organisation ID to the JWT token
- Enables RLS policies to work without database lookups

### 3.3 Save Configuration

Click **Save** to apply the session token customization.

## Step 4: Set Up Clerk Webhook

Configure a webhook to sync user data between Clerk and Supabase.

### 4.1 Create Webhook Endpoint

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/webhooks/clerk`
   - For local development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
4. Select events to listen for:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### 4.2 Get Webhook Secret

1. After creating the webhook, copy the **Signing Secret**
2. Add it to your `.env.local` file as `CLERK_WEBHOOK_SECRET`

### 4.3 Test Webhook (Local Development)

For local testing, use ngrok or similar service:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your Next.js development server
npm run dev

# In another terminal, expose localhost:3000
ngrok http 3000

# Use the ngrok URL in your Clerk webhook configuration
```

## Step 5: Create Initial Data

### 5.1 Create an Organisation

Use Supabase SQL Editor or your preferred database tool:

```sql
-- Create a test organisation
INSERT INTO organisations (name) VALUES ('Test Organisation');

-- Get the organisation ID for the next step
SELECT * FROM organisations;
```

### 5.2 Create Platform Admin User

1. Sign up a new user in your application
2. Get their Clerk user ID from the Clerk dashboard
3. Update their metadata in Clerk:

Go to **Users** in Clerk Dashboard, select the user, and add to **Public metadata**:

```json
{
  "role": "platform_admin",
  "organisation_id": "your-org-id-from-step-5.1"
}
```

Or use Supabase to update directly:

```sql
-- Update the user record with organisation
UPDATE users
SET organisation_id = 'your-org-id-from-step-5.1'
WHERE clerk_id = 'your-clerk-user-id';

-- Assign platform admin role
INSERT INTO user_roles (user_id, role_id, organisation_id)
SELECT
  (SELECT id FROM users WHERE clerk_id = 'your-clerk-user-id'),
  (SELECT id FROM roles WHERE name = 'platform_admin'),
  'your-org-id-from-step-5.1';
```

## Step 6: Verification

Test the implementation:

### 6.1 User Authentication Flow

1. Sign up a new user
2. Check that a user record was created in Supabase `users` table
3. Verify the user was assigned the `org_member` role
4. Confirm the user's Clerk metadata was updated

### 6.2 RLS Policy Testing

1. Log in as different users
2. Create recipes - they should be scoped to the user's organisation
3. Verify users can only see recipes within their organisation
4. Test role-based access:
   - Platform admins should see all data
   - Org admins should see their organisation's data
   - Org members should see their organisation's data

### 6.3 Webhook Testing

Monitor your application logs and Supabase tables when:
- Creating new users
- Updating user profiles
- Deleting users

Check that changes are properly synchronized.

## Troubleshooting

### Common Issues

#### 1. RLS Policy Violations

If you see "new row violates row-level security policy" errors:

- Verify session token configuration includes `role` and `org_id` claims
- Check that users have proper role assignments
- Ensure organisation_id is set in user metadata

#### 2. Webhook Not Firing

- Verify webhook URL is accessible (use ngrok for local development)
- Check webhook secret matches your environment variable
- Monitor webhook delivery logs in Clerk dashboard

#### 3. Authentication Issues

- Ensure service role key is correct
- Verify Clerk-Supabase integration is properly configured
- Check that JWT token includes expected claims

### Debug Session Token

To debug session token claims, add this temporarily to a server component:

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function DebugPage() {
  const { getToken } = await auth();
  const token = await getToken();

  // Decode JWT payload (base64)
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('JWT Claims:', payload);

  return <pre>{JSON.stringify(payload, null, 2)}</pre>;
}
```

## Next Steps

After completing setup:

1. **Test thoroughly** with different user roles and organisations
2. **Implement UI** for organisation management (admin panels)
3. **Add role-based navigation** and feature restrictions
4. **Set up monitoring** for webhook and authentication issues
5. **Configure production** environment variables

## Architecture Overview

The implemented system provides:

- **3-Role RBAC**: `platform_admin`, `org_admin`, `org_member`
- **JWT-Based RLS**: High-performance access control using session token claims
- **Automatic User Sync**: Clerk webhooks maintain Supabase user data
- **Organisation Isolation**: Complete data separation between organisations
- **Scalable Design**: Ready for multi-tenant SaaS deployment

For additional information, see:
- `docs/clerk-supabase-integration.md` - Authentication integration details
- `supabase/migrations/001_multi_tenant_schema.sql` - Complete database schema
- `lib/auth/user.ts` - User context utilities and role checking functions