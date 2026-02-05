# Navigation Redesign

## Goal
Replace the current navigation with a clean, simplified structure. Build fresh on the `main` branch - don't try to resolve the existing merge conflicts in Navbar.tsx. Start Navbar.tsx from scratch - don't carry over old code.

## Current Problems
- Merge conflicts in Navbar.tsx on the feature branch
- Admin dropdown only visible to platform_admin (org_admin can't see it)
- Users link missing from admin dropdown
- Reports link doesn't exist anywhere
- Admin layout has a redundant sub-navigation bar below the header
- Inconsistent mobile menu

## Branding

**No branding.** Do not use "AI Potential", "Greenwich Momentum", or any company name anywhere in the UI. The portal is intentionally unbranded.

- Header: Use the word **"Portal"** as a text link (no logo image)
- Welcome page: Generic language ("Welcome to your portal")
- Page title: "Portal" (or just leave as the page name)

---

## Styling

Use existing shadcn/ui components (Button, DropdownMenu, Sheet for mobile, etc.) with these colour guidelines:

**Colour Palette:**
- Charcoal: `#2c2c2c`
- Ink Black: `#1a1a1a`
- Aged Brass: `#8c7851`
- Warm White: `#f8f7f5`
- Stone: `#edebe7`
- Graphite: `#5c5c5c`

**Header:**
- Background: Charcoal (`#2c2c2c`)
- Text and links: Warm White (`#f8f7f5`)
- Hover state: Subtle lightening or Aged Brass (`#8c7851`) accent
- Active link indicator: Aged Brass underline or highlight

**Mobile Menu:**
- Same colour scheme as desktop header
- Clean divider between main links and admin section

**Breadcrumbs:**
- Text: Graphite (`#5c5c5c`)
- Links: Graphite, with hover state
- Current page (last segment): Charcoal (`#2c2c2c`), not a link, slightly bolder

**Dashboard Cards:**
- Background: White or Warm White (`#f8f7f5`)
- Border: Subtle Stone (`#edebe7`)
- Hover: Slight shadow or border accent

**General:**
- Keep it minimal — no heavy borders or shadows
- The design should feel understated and professional
- Consistent spacing using Tailwind defaults

---

## What To Build

### 1. Welcome Page (Signed Out)

**Route:** `/`

When a user is not signed in, show a simple welcome page:
- The word "Portal" as a heading
- Friendly welcome message: "Welcome to your portal"
- Brief description: "Access your training courses, AI workflows, and resources"
- Sign In button (uses Clerk)
- Clean, minimal layout - no navigation links

**Redirect rule:** Signed-in users who navigate to `/` must be redirected to `/dashboard`. Configure this in `middleware.ts`.

---

### 2. Clerk Post-Sign-In Redirect

After signing in via Clerk, users must be redirected to `/dashboard`.

Configure Clerk's redirect settings:
- `afterSignInUrl: '/dashboard'`
- `afterSignUpUrl: '/dashboard'`

Check this in the Clerk provider configuration or environment variables (`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`).

---

### 3. Header Navigation (Signed In)

**Desktop layout:**
```
Portal | Courses | Workflows | Book Workflows | [Admin ▼] | [User Menu]
```

**"Portal":** Plain text link to `/dashboard`. Not a logo image.

**Main links (all signed-in users):**
- Courses → `/courses`
- Workflows → `/workflows`
- Book Workflows → `/book-workflows`

**Admin dropdown (admins only):**

For `platform_admin`:
```
Admin ▼
├── Courses → /admin/courses
├── Workflows → /admin/workflows
├── Book Workflows → /admin/book-workflows
├── Users → /admin/users
├── Organisations → /admin/organizations
└── Reports → /admin/reports
```

For `org_admin`:
```
Admin ▼
├── Users → /admin/users
└── Reports → /admin/reports
```

**User menu:** Clerk's UserButton component (existing)

---

### 4. Mobile Navigation (Signed In)

Hamburger menu containing:

**All users:**
- Courses → `/courses`
- Workflows → `/workflows`
- Book Workflows → `/book-workflows`

**Admin section (if admin):**
- Divider line
- "Admin" label
- Same links as desktop admin dropdown (role-dependent)

---

### 5. Dashboard Page

**Route:** `/dashboard`

**All users see:**
- Welcome message with user's name (e.g., "Welcome back, Coral")
- Three quick-link cards:
  - Courses → `/courses` (with brief description)
  - Workflows → `/workflows` (with brief description)
  - Book Workflows → `/book-workflows` (with brief description)

**Platform admin also sees:**
- A summary section below the quick links showing:
  - Total users across all organisations
  - Total organisations
  - Total courses
  - Total workflows
- These are simple stat cards, not charts
- An "Admin" quick-link card alongside the others

**Org admin also sees:**
- An "Admin" quick-link card alongside the others
- No platform-wide stats

This is a landing page, not a complex analytics dashboard. Keep it simple.

---

### 6. Breadcrumbs on Admin Pages

**Remove** the existing admin layout sub-navigation bar (the secondary nav that appears at the top of `/admin/*` pages).

**Replace with** breadcrumbs on each admin page.

**Breadcrumb depth: Maximum 3 levels.** Examples:

```
Admin / Courses
Admin / Courses / Edit: Dolphin Training
Admin / Workflows / Import
Admin / Users
Admin / Book Workflows
Admin / Organisations
Admin / Reports
```

For deeper pages (e.g., Course → Module → Lesson), still show max 3 levels:
```
Admin / Courses / Edit: Dolphin Training
```
Not:
```
Admin / Courses / Dolphin Training / Module 1 / Lesson 3
```

Each breadcrumb segment is a link except the last one. Use a simple breadcrumb component with a `/` separator.

---

### 7. Reports Placeholder

**Route:** `/admin/reports`

Create a placeholder page:
- Breadcrumb: Admin / Reports
- Page title: "Reports"
- Card with message: "Completion reports are coming soon."
- Accessible to both platform_admin and org_admin

---

### 8. Active State

The current page should be visually highlighted in the navigation:
- Active nav link has a different style (Aged Brass underline or bolder text)
- In the admin dropdown, the current section is indicated
- In breadcrumbs, the last segment (current page) is not a link and styled differently

---

### 9. Route Protection

Hiding links in the navigation is not enough. Admin routes must be protected at the page level.

**Rules:**
- `/admin/courses` → platform_admin only
- `/admin/workflows` → platform_admin only
- `/admin/book-workflows` → platform_admin only
- `/admin/organizations` → platform_admin only
- `/admin/users` → platform_admin and org_admin
- `/admin/reports` → platform_admin and org_admin
- All `/admin/*` routes → redirect to `/dashboard` if user has no admin role

**Check existing middleware and page-level guards.** If route protection already exists for some admin pages, extend the same pattern to cover all routes. If it doesn't exist, add it.

An org_admin who types `/admin/courses` into the address bar should be redirected, not shown an error.

---

## Permission Summary

| Element | Who Sees It |
|---------|------------|
| Welcome page | Signed out users only |
| Dashboard | All signed-in users |
| Main nav (Courses, Workflows, Book Workflows) | All signed-in users |
| Admin dropdown | platform_admin and org_admin only |
| Admin → Courses, Workflows, Book Workflows, Organisations | platform_admin only |
| Admin → Users, Reports | platform_admin and org_admin |
| Dashboard platform stats | platform_admin only |
| Dashboard "Admin" card | platform_admin and org_admin |

---

## Files to Create or Modify

```
Create:
├── app/(public)/page.tsx                       # Welcome page (signed out)
├── app/(authenticated)/dashboard/page.tsx      # Dashboard (signed in)
├── app/(authenticated)/admin/reports/page.tsx   # Reports placeholder
├── components/Breadcrumbs.tsx                   # Breadcrumb component

Modify:
├── components/Navbar.tsx                        # Complete rewrite from scratch
├── app/(authenticated)/admin/layout.tsx         # Remove sub-navigation bar
├── middleware.ts                                # Add: signed-in redirect from / to /dashboard
                                                  # Add/verify: admin route protection

Check/Update:
├── Clerk config or .env                         # afterSignInUrl = /dashboard
├── Existing admin page guards                   # Extend to all admin routes
```

**Important:** Start Navbar.tsx from scratch. Do not try to patch or merge the old code. Remove any unused imports, components, or icon references left over from the old navigation.

---

## How to Test

### Test 1: Signed Out Experience
1. Sign out
2. Go to `/` → See welcome page with "Welcome to your portal" and sign in button
3. Go to `/dashboard` → Redirected to sign in
4. Go to `/courses` → Redirected to sign in
5. Sign in → Redirected to `/dashboard`

**Pass if:** Welcome page shows, all protected routes redirect to sign in, post-sign-in lands on dashboard.

### Test 2: Signed In Redirect
1. Sign in
2. Go to `/` → Redirected to `/dashboard`

**Pass if:** Signed-in users never see the welcome page.

### Test 3: Regular User Navigation
**Log in as:** Coral Clam (org_member)

1. See header: Portal | Courses | Workflows | Book Workflows | User Menu
2. No Admin dropdown visible
3. Click "Portal" → `/dashboard`
4. Dashboard shows welcome message with name and 3 quick-link cards
5. No admin card, no stats section
6. Click Courses → `/courses`
7. Click Workflows → `/workflows`
8. Click Book Workflows → `/book-workflows`
9. Active link is highlighted

**Pass if:** All links work, no admin dropdown, no admin content on dashboard.

### Test 4: Org Admin Navigation
**Log in as:** org_admin user

1. See header: Portal | Courses | Workflows | Book Workflows | Admin ▼ | User Menu
2. Click Admin dropdown → See only: Users, Reports
3. Do NOT see: Courses, Workflows, Book Workflows, Organisations
4. Click Users → `/admin/users` → See breadcrumb: Admin / Users
5. Click Reports → `/admin/reports` → See "Coming Soon" placeholder
6. Dashboard shows 3 quick-link cards + Admin card
7. No platform stats on dashboard

**Pass if:** Limited admin dropdown, breadcrumbs work, dashboard appropriate for role.

### Test 5: Platform Admin Navigation
**Log in as:** platform_admin

1. See header: Portal | Courses | Workflows | Book Workflows | Admin ▼ | User Menu
2. Click Admin dropdown → See all 6 links
3. Click each one → Correct page loads
4. Each admin page shows breadcrumbs (no secondary nav bar)
5. Dashboard shows 3 quick-link cards + Admin card + platform stats

**Pass if:** Full admin dropdown, all pages accessible, breadcrumbs only, stats visible.

### Test 6: Mobile Navigation
1. Resize browser to mobile width
2. See hamburger menu
3. Open menu → See main links
4. If admin: see admin section below divider
5. Links work and menu closes after clicking

**Pass if:** Mobile menu matches desktop structure for each role.

### Test 7: Route Protection
1. As org_member: Go to `/admin/courses` → Redirected to `/dashboard`
2. As org_member: Go to `/admin/users` → Redirected to `/dashboard`
3. As org_admin: Go to `/admin/courses` → Redirected to `/dashboard`
4. As org_admin: Go to `/admin/users` → Works (scoped to their org)
5. As org_admin: Go to `/admin/organizations` → Redirected to `/dashboard`
6. As platform_admin: Go to `/admin/courses` → Works

**Pass if:** URL access matches permission rules. No errors, clean redirects.

---

## Important Notes

- Build fresh on `main` branch - ignore the feature branch conflicts
- Start Navbar.tsx from scratch - do not patch old code
- Use existing shadcn/ui components (Button, DropdownMenu, etc.)
- Keep the Clerk UserButton as-is for the user menu
- No branding - use "Portal" as plain text, no logo images, no company names
- Breadcrumbs replace the admin sub-nav entirely - do not keep both
- Dashboard is a simple landing page - not a complex analytics view
- Route protection is required at the page level, not just hidden nav links