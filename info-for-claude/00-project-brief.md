# AI Potential Membership Portal - Project Brief

## What We're Building

A membership portal for AI Potential (an AI training consultancy) where clients can:
- Access training courses with video lessons
- Browse a library of AI workflow templates
- Track their learning progress

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Storage)
- Clerk (Authentication)

## What's Already Built

Multi-tenant foundation is complete and tested:
- Three roles: `platform_admin`, `org_admin`, `org_member`
- Organisations and users tables with RLS
- Helper functions: `is_platform_admin()`, `is_org_admin()`, `get_current_user_id()`, `get_current_user_organisation_id()`
- Clerk + Supabase native integration working
- JWT tokens contain `user_role` and `org_id` claims

The existing recipe code (recipes, comments, recipes_unlocked) should be removed - it was template code.

## User Roles

| Role | Can Do |
|------|--------|
| platform_admin | Everything - manage all orgs, users, content |
| org_admin | Manage users in own org, view own org's reports |
| org_member | Access enrolled courses, browse workflows |

## Build Phases

### Phase A: Courses (Priority)
Build the course system so users can learn.

### Phase B: Workflow Library
Import and display the workflow library so users can find AI templates.

### Phase C: User Management
Proper user onboarding via CSV import with invitation tracking.

### Phase D: Lesson Versioning
Version history for lesson content (keep last 2).

### Phase E: Workflow Admin
Full CRUD for workflows plus file versioning (keep last 10).

### Phase F: Reporting + Orgs
Completion dashboards and organisation management.

## Key Decisions Already Made

1. **Courses**: Hierarchy is Course → Module → Lesson. Progress tracking needed. Org-level and individual enrollment.

2. **Lesson Media**: Simple model - each lesson has an optional Vimeo embed field and optional file attachments. Render in fixed order: video → HTML content → downloads. No placeholder parsing.

3. **Workflow Library**: Two-tier browse (Category → Department → Workflow). Global visibility - all users see all workflows. Imported via CSV.

4. **Versioning**: Lessons keep 2 versions, workflow files keep 10. Admin can view history and restore.

5. **User Import**: CSV upload creates Clerk invitations. Track invitation status (pending/accepted/failed).

6. **Access Control**: Courses scoped by org enrollment or individual enrollment. Workflows are global.

## Working Together

I'll give you phase-specific briefs. Build each phase, verify it works, then we move to the next. Check in with the main conversation for guidance if needed.

## Success = MVP Complete

When all phases are done:
- Admin can create courses with video lessons
- Admin can import and manage workflows
- Admin can onboard users via CSV
- Users can access courses and track progress
- Users can browse and search workflows
- Admins can see completion rates
