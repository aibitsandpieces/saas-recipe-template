# Phase F: Reporting + Organisations

## Goal
Admins can see completion rates. Platform admins can manage organisations. MVP complete.

## Build Order

### 1. Organisation Management

Build in `/admin/organisations` (platform_admin only):
- List organisations with user counts
- Create organisation (name field)
- Edit organisation
- Delete organisation (with warning about affected users)

Note: Deleting org sets users' organisation_id to null, doesn't delete users.

### 2. Completion Dashboard

Build in `/admin/reports`:

**For org_admin:**
- Summary cards: Total Users, Courses Available, Average Completion
- Course breakdown table: Course, Enrolled, Completed, In Progress, Not Started, %
- Expandable rows showing user progress within each course

**For platform_admin:**
- Organisation dropdown filter (including "All Organisations")
- Same view as org_admin but with org filter
- Platform summary when "All" selected

### 3. Completion Calculation

For each course:
- Total enrolled = users whose org is enrolled + individually enrolled users
- Completed = users who finished all lessons
- In Progress = users who finished some lessons
- Not Started = users who finished zero lessons
- Completion % = Completed / Total Enrolled

### 4. User Progress Display

In expanded course row, show table:
- User Name, Email, Progress (X/Y lessons), Status, Last Activity
- Status badges: Completed (green), In Progress (yellow), Not Started (gray)

## How to Test

1. As platform_admin: Create organisation → See in list
2. As platform_admin: View reports → Select org → See completion data
3. As org_admin: View reports → Only see own org data
4. Verify completion calculations match actual progress

## Done When

- [ ] Organisation CRUD works
- [ ] Org admin sees own org completion
- [ ] Platform admin can filter by org
- [ ] Platform admin sees "All" aggregate
- [ ] Completion percentages are accurate
- [ ] User progress details visible

## MVP Complete Checklist

After Phase F, verify the full system:

- [ ] Admin can create course with video lessons
- [ ] Admin can import workflows from CSV
- [ ] Admin can onboard users via CSV
- [ ] Users see enrolled courses only
- [ ] Users can complete lessons with progress tracking
- [ ] Users can browse/search workflow library
- [ ] Lesson versions can be restored
- [ ] Workflow files can be versioned and restored
- [ ] Completion rates visible to admins
- [ ] Organisations can be managed
