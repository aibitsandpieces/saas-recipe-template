# Phase C: User Management

## Goal
Admins can onboard users via CSV. Invitation status is tracked.

## Build Order

### 1. Database Setup

```sql
user_invitations (id, email, name, organisation_id FK, role, clerk_invitation_id, status, invited_at, invited_by FK, accepted_at, error_message, courses[])
-- status: 'pending', 'accepted', 'failed'

course_user_enrollments (id, course_id FK, user_id FK, enrolled_at, enrolled_by FK)
-- For individual enrollment (supplements org-level)
```

### 2. Update Course RLS

Add individual enrollment check to course policies:
```sql
-- User can access course if:
-- 1. Platform admin, OR
-- 2. Their org is enrolled, OR  
-- 3. They are individually enrolled
```

### 3. CSV Template

Columns: `email`, `name`, `role`, `organisation`, `courses`

- email: required, valid format
- name: required
- role: 'org_admin' or 'org_member'
- organisation: must match existing org name
- courses: optional, comma-separated course names for individual enrollment

### 4. CSV Import Flow

Build in `/admin/users/import`:
1. Download template button
2. Upload CSV
3. Validate (check emails, orgs exist, courses exist)
4. Preview with error highlighting
5. Confirm → Create Clerk invitations
6. Track status in user_invitations table

### 5. Webhook Update

Update `/api/webhooks/clerk` to handle invitation flow:
- On `user.created`: Check for matching invitation by email
- Set organisation_id and role from invitation or public_metadata
- Create individual course enrollments if specified
- Update invitation status to 'accepted'

### 6. Admin UI

Build in `/admin/users`:
- User list (filterable by org for platform_admin, scoped for org_admin)
- Import page with template download
- Invitation list with status filter
- Resend invitation button for pending/failed
- Role change dropdown

## How to Test

1. Download CSV template → Fill with test users → Upload
2. See preview → Confirm → Invitations sent
3. Check invitation list → All show "Pending"
4. Accept invitation as test user → End up in correct org with correct role
5. Invitation status changes to "Accepted"
6. If individual courses specified, user has access

## Done When

- [ ] CSV template downloads
- [ ] CSV validation catches errors
- [ ] Clerk invitations sent
- [ ] Invitation status tracked
- [ ] Webhook assigns org and role correctly
- [ ] Individual course enrollment works
- [ ] Resend invitation works
- [ ] Role change works
- [ ] Org admin is properly scoped
