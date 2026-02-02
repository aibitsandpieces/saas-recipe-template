# Phase A: Course System

## Goal
Admin can create courses. Users can access and complete them.

## Build Order

### 1. Database Setup

Remove recipe tables first (recipes, comments, recipes_unlocked).

Create these tables with RLS enabled:

```sql
courses (id, name, slug, description, thumbnail_url, is_published, sort_order, created_at, updated_at)

course_modules (id, course_id FK, name, description, sort_order, created_at, updated_at)

course_lessons (id, module_id FK, name, slug, html_content, vimeo_embed_code, sort_order, created_at, updated_at)

course_lesson_files (id, lesson_id FK, file_name, display_name, storage_path, file_size_bytes, sort_order, created_at)

course_org_enrollments (id, course_id FK, organisation_id FK, enrolled_at, enrolled_by FK)

course_user_progress (id, user_id FK, lesson_id FK, completed_at, last_accessed_at)
```

### 2. RLS Policies

- Users can view published courses they're enrolled in (via org)
- Platform admins have full access to everything
- Users can manage their own progress only
- Platform admins can view all progress

### 3. Storage Bucket

Create `courses` bucket for lesson file uploads.

### 4. Admin UI

Build in `/admin/courses`:
- Course list (table with publish status)
- Course editor (name, slug, description, thumbnail)
- Module management (add/edit/delete/reorder within course)
- Lesson editor (name, Vimeo embed field, HTML content textarea, file uploads)
- Enrollment manager (checkbox list of organisations)

### 5. User UI

Build in `/courses`:
- Course list (grid of enrolled courses with progress)
- Course view (modules with lessons, progress indicators)
- Lesson view (video at top, HTML content, download links, mark complete button)

## Lesson Content Structure

Each lesson has:
- `vimeo_embed_code` - optional, renders as iframe at top
- `html_content` - the main content, rendered below video
- Files via `course_lesson_files` - render as download links at bottom

## How to Test

1. As platform_admin: Create course → Add module → Add lesson with video and PDF → Enroll an org → Publish
2. As org_member from that org: See course → Navigate lessons → Watch video → Download file → Mark complete
3. As org_member from different org: Should NOT see the course

## Done When

- [ ] Recipe code removed
- [ ] Course CRUD works
- [ ] Module CRUD works  
- [ ] Lesson editor works (video + content + files)
- [ ] Enrollment works
- [ ] Users see only enrolled courses
- [ ] Progress tracking works
- [ ] Lessons render correctly with video/content/downloads
