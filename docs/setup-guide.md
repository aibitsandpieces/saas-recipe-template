# Multi-Tenant SaaS Template - Setup Guide

This guide walks you through setting up the template for a new project from start to finish.

## 📋 Prerequisites

- [Node.js 18+](https://nodejs.org/en)
- [Git](https://git-scm.com/)
- [Supabase account](https://supabase.com/)
- [Clerk account](https://clerk.com/)

## 🚀 Quick Setup (5 Minutes)

### 1. Clone Template Repository

```bash
git clone https://github.com/your-username/ai-potential-saas-template.git my-saas-app
cd my-saas-app
npm install
```

### 2. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose organization and set project name
4. Set a strong database password
5. Select region closest to your users
6. Wait for project to be ready (~2 minutes)

### 3. Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click **"Add Application"**
3. Choose **"Next.js"** framework
4. Set application name
5. Configure sign-in options (Email, Google, etc.)

### 4. Configure Environment Variables

Create `.env.local` in project root:

```env
# Clerk Authentication (from Clerk Dashboard → API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase Database (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Webhook Configuration (set later)
CLERK_WEBHOOK_SECRET=whsec_...
```

### 5. Deploy Database Schema

Run the migration to create the multi-tenant database:

```bash
# If you have Supabase CLI
supabase db push

# OR manually run the SQL file
# Copy content from supabase/migrations/001_multi_tenant_schema.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

### 6. Test Initial Setup

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the homepage with sign-in functionality!

## 🔧 Detailed Configuration

### Supabase Configuration

#### A. Get API Keys
1. **Supabase Dashboard** → Your Project → **Settings** → **API**
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

#### B. Configure Third-Party Auth
1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Scroll to **Clerk** (or custom OIDC provider)
3. **Enable** the provider
4. Set **Issuer URL**: `https://your-clerk-domain.clerk.accounts.dev`
5. Leave other fields empty (auto-discovered via OIDC)

### Clerk Configuration

#### A. Get API Keys
1. **Clerk Dashboard** → Your App → **Developers** → **API Keys**
2. Copy **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
3. Copy **Secret key** → `CLERK_SECRET_KEY`

#### B. Configure Session Token Claims
1. **Clerk Dashboard** → Your App → **Sessions** → **Customize session token**
2. Add custom claims:
```json
{
  "role": "authenticated",
  "user_role": "{{user.public_metadata.role || 'org_member'}}",
  "org_id": "{{user.public_metadata.organisation_id}}"
}
```

#### C. Set Up Webhooks (User Sync)
1. **Clerk Dashboard** → Your App → **Webhooks** → **Add Endpoint**
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
   - For local development: Use ngrok → `https://xxx.ngrok.io/api/webhooks/clerk`
3. **Events to Listen**: `user.created`, `user.updated`, `user.deleted`
4. Copy **Signing secret** → `CLERK_WEBHOOK_SECRET`

## 🗄️ Database Setup

### Run Migration
The template includes a complete multi-tenant schema. Apply it:

```sql
-- supabase/migrations/001_multi_tenant_schema.sql contains:
-- - organisations table
-- - users table (synced from Clerk)
-- - roles table (3 roles: platform_admin, org_admin, org_member)
-- - user_roles table (role assignments)
-- - Example business tables (recipes, comments, recipes_unlocked)
-- - RLS policies for multi-tenant isolation
```

### Verify Tables Created
Check in **Supabase Dashboard** → **Table Editor**:
- ✅ organisations
- ✅ users
- ✅ roles
- ✅ user_roles
- ✅ recipes (example business table)
- ✅ comments (example related table)
- ✅ recipes_unlocked (example premium feature)

### Create Initial Data
1. **Create first organization** (via Supabase Dashboard):
   ```sql
   INSERT INTO organisations (name)
   VALUES ('Your Company Name');
   ```

2. **Get organization ID** for setup:
   ```sql
   SELECT id, name FROM organisations;
   ```

## 👤 User Management Setup

### Create First Platform Admin
After first user signs up via Clerk:

1. **Find user in Supabase**:
   ```sql
   SELECT * FROM users WHERE email = 'your-email@company.com';
   ```

2. **Assign to organization**:
   ```sql
   UPDATE users
   SET organisation_id = 'your-org-id'
   WHERE email = 'your-email@company.com';
   ```

3. **Assign platform admin role**:
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id
   FROM users u, roles r
   WHERE u.email = 'your-email@company.com'
   AND r.name = 'platform_admin';
   ```

4. **Update Clerk metadata**:
   ```bash
   # Via Clerk Dashboard → Users → Select User → Metadata
   # Add to public_metadata:
   {
     "role": "platform_admin",
     "organisation_id": "your-org-id"
   }
   ```

## 🧪 Test Your Setup

### Verification Checklist
- [ ] **Sign up works** - New users can create accounts
- [ ] **Sign in works** - Users can authenticate
- [ ] **JWT contains claims** - Check browser console:
  ```javascript
  window.Clerk.session.getToken().then(token => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Claims:', payload);
  });
  ```
- [ ] **Database isolation** - Users only see their organization's data
- [ ] **Webhooks work** - New users appear in Supabase `users` table
- [ ] **Roles work** - Different permissions for different roles

### Test User Flows
1. **Create test users** in different roles and organizations
2. **Verify data isolation** - org members can't see other org data
3. **Test business operations** - recipe creation/viewing works
4. **Verify role permissions** - admins have broader access

## 🚨 Troubleshooting

### Common Issues

#### "Authentication Error" or "Unauthorized"
- ✅ Check Clerk session token claims include `role`, `user_role`, `org_id`
- ✅ Verify Supabase Third-Party Auth is configured for Clerk
- ✅ Check environment variables are loaded correctly

#### "RLS Policy Violation"
- ✅ Verify user has `organisation_id` set in database
- ✅ Check RLS policies exist and are enabled
- ✅ Ensure JWT claims are properly configured

#### "User not found in database"
- ✅ Check webhook endpoint is working
- ✅ Verify `CLERK_WEBHOOK_SECRET` is correct
- ✅ Check webhook events are configured correctly

#### "Cannot access recipes/data"
- ✅ User must be assigned to an organization
- ✅ Check user role assignments in `user_roles` table
- ✅ Verify organization isolation is working

### Debug Commands

```bash
# Check environment variables
npm run dev
# Look for "Environment variables loaded" in console

# Test database connection
# In Supabase Dashboard → SQL Editor:
SELECT 'Database connected' as status;

# Check user setup
SELECT u.email, u.organisation_id, r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;
```

## 🎯 Next Steps

Once setup is complete:

1. **Customize for your business** - Follow `docs/customization-guide.md`
2. **Run comprehensive tests** - Use `docs/testing-plan-multi-tenant-saas.md`
3. **Deploy to production** - Configure production environment variables
4. **Set up monitoring** - Add error tracking and performance monitoring

## 📚 Additional Resources

- [Customization Guide](customization-guide.md) - Adapt template for your business
- [Architecture Guide](../CLAUDE.md) - Understanding the system design
- [Testing Plan](testing-plan-multi-tenant-saas.md) - Comprehensive testing procedures
- [Clerk + Supabase Integration](clerk-supabase-jwt-integration-2025.md) - Deep dive on auth setup

**Need Help?**
- Check existing documentation first
- Review error logs in browser console and server
- Test with the included example (recipes) before customizing