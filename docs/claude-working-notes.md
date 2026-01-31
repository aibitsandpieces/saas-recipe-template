# Claude Working Notes

This file contains work-in-progress notes for Claude to resume context on complex tasks.

## 2026-01-31: Multi-Tenant Database Schema & User Management Implementation

### Goal
Implement a complete multi-tenant system with organisations, user management, and 3-role RBAC (platform_admin, org_admin, org_member) on top of the existing Clerk + Supabase integration. Transform the single-tenant Recipe Emporium into a scalable multi-tenant SaaS platform.

### Current State of Codebase
✅ **IMPLEMENTATION COMPLETE** - All core functionality has been implemented:

#### Database Layer
- ✅ Migration file: `supabase/migrations/001_multi_tenant_schema.sql`
  - Created `organisations`, `users`, `roles`, `user_roles` tables
  - Added `organisation_id` to existing `recipes`, `comments`, `recipes_unlocked` tables
  - Implemented JWT-based RLS policies for performance optimization
  - Seeded 3 roles: platform_admin, org_admin, org_member
  - Cleaned existing test data

#### Authentication & Authorization
- ✅ Service role client: `lib/supabase-admin.ts` (for webhook operations)
- ✅ Webhook handler: `app/api/webhooks/clerk/route.ts` (handles user.created, user.updated, user.deleted)
- ✅ User utilities: `lib/auth/user.ts` (role checking, organisation context)
- ✅ Middleware: Updated `middleware.ts` to allow webhook endpoint

#### Business Logic Updates
- ✅ Recipe actions: `lib/actions/recipe.actions.ts` - All operations now organisation-scoped
- ✅ Comment actions: `lib/actions/comment.actions.ts` - Organisation-scoped
- ✅ All server actions updated to use `requireUserWithOrg()` pattern

#### Dependencies & Configuration
- ✅ Installed `svix` package for webhook verification
- ✅ Updated `.env.local` with new environment variables
- ✅ Documentation: `docs/multi-tenant-setup.md` (comprehensive setup guide)

### Key Decisions Made

#### Architecture Decisions
1. **JWT Claims for RLS**: Using Clerk session token claims (`role`, `org_id`) instead of database lookups for optimal performance
2. **Service Role Key**: Confirmed this is NOT legacy - still best practice for webhook operations in 2026
3. **3-Role RBAC**: platform_admin (global), org_admin (org-specific), org_member (standard)
4. **Organisation Isolation**: Complete data separation between organisations via RLS policies

#### Technical Decisions
1. **Webhook Strategy**: Clerk webhooks automatically sync user data with Supabase
2. **User Context Pattern**: `requireUserWithOrg()` ensures all operations have organisation context
3. **RLS Policy Design**: JWT-based policies for performance (no database lookups in RLS)
4. **Migration Strategy**: Clean slate approach (delete test data, rebuild schema)

### Configuration Still Required (Manual Steps)
⚠️ **CRITICAL**: These steps must be completed to activate the system:

1. **Clerk Session Token Configuration** (Dashboard → Sessions → Customize):
   ```json
   {
     "role": "{{user.public_metadata.role || 'org_member'}}",
     "org_id": "{{user.public_metadata.organisation_id}}"
   }
   ```

2. **Environment Variables**:
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Settings → API)
   - `CLERK_WEBHOOK_SECRET` (from webhook endpoint creation)

3. **Database Migration**: `supabase db push` (or run SQL manually)

4. **Webhook Endpoint**: Create in Clerk Dashboard pointing to `/api/webhooks/clerk`

5. **Initial Data**: Create first organisation and platform admin user

### Testing Strategy & Verification
Need to verify:
- [ ] Database migration runs successfully
- [ ] Clerk session token includes correct claims
- [ ] Webhook successfully creates/updates/deletes users
- [ ] RLS policies work correctly per role:
  - Platform admin sees all organisations
  - Org admin sees only their org data
  - Org members see only their org data
- [ ] Recipe/comment operations are properly scoped
- [ ] User signup flow assigns correct roles

### Open Questions
1. **UI Implementation**: How should organisation management UI look? Admin panels for role assignment?
2. **Organisation Creation**: Who can create new organisations? Self-service or admin-only?
3. **User Invitations**: How should users be invited to organisations? Email invites?
4. **Billing Integration**: How does Clerk billing work with multiple organisations?
5. **Data Migration**: If there was existing production data, how would we migrate it?

### What I Would Do Next
If continuing this work:

1. **Immediate Priority**: Complete the manual configuration steps in `docs/multi-tenant-setup.md`
2. **Testing**: Create comprehensive test suite for multi-tenant scenarios
3. **UI Development**: Build admin interfaces for:
   - Organisation management
   - User role assignment
   - Platform admin dashboard
4. **Error Handling**: Add better error handling and user feedback for organisation-related operations
5. **Performance**: Monitor RLS policy performance and optimize if needed
6. **Documentation**: Create developer guide for adding new multi-tenant features

### Critical Files Modified/Created
- `supabase/migrations/001_multi_tenant_schema.sql` - Complete database schema
- `app/api/webhooks/clerk/route.ts` - User lifecycle sync
- `lib/auth/user.ts` - User context utilities
- `lib/supabase-admin.ts` - Service role client
- `lib/actions/recipe.actions.ts` - Updated with org context
- `lib/actions/comment.actions.ts` - Updated with org context
- `middleware.ts` - Allow webhook route
- `docs/multi-tenant-setup.md` - Setup instructions

### Notes for Future Claude
- The implementation follows the exact plan provided
- All code is production-ready but untested
- The architecture is designed for scale (JWT-based RLS, efficient queries)
- Service role key usage confirmed as current best practice (not legacy)
- System is ready for activation once manual configuration steps are completed


## Notes from Gareth
###Questions:

### 1 Should I have removed this as Clerk session customization was:
###{
###	"role": "authenticated"
###}

### 2 For Clerk webhook, I'm using local dev https://your-ngrok-url.ngrok.io/api/webhooks/clerk but I don't know what to put here

###signing secret: whsec_VngOSRO5sWDFsg19r3koRIW5uq0ort4E

### https://dashboard.clerk.com/apps/app_391kmGzQIytfSIUP2RqmKDUrEhY/instances/ins_391kmIDOG5fLyjs89SCRuFbUmyX/webhooks

