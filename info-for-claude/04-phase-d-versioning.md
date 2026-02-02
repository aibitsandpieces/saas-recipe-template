# Phase D: Lesson Versioning

## Goal
Lesson edits create version history. Admins can restore previous versions. Keep last 2.

## Build Order

### 1. Database Setup

```sql
course_lesson_versions (id, lesson_id FK, version_number, html_content, vimeo_embed_code, created_at, created_by FK)

-- Add to course_lessons:
alter table course_lessons add column current_version integer default 1;
```

### 2. Versioning Logic

On lesson content update:
1. Save current content to versions table
2. Update lesson with new content
3. Increment current_version
4. Delete versions older than the last 2

On restore:
1. Save current content to versions (so you don't lose it)
2. Copy selected version content to lesson
3. Increment version number
4. Clean up old versions

### 3. Admin UI Updates

Add to lesson editor:
- Version indicator ("Version 3")
- "Version History" button
- Modal showing versions with date/author
- "Restore" button on each old version
- Confirmation before restore

## How to Test

1. Create lesson (version 1)
2. Edit content → Save (version 2, v1 in history)
3. Edit content → Save (version 3, v2 in history, v1 deleted)
4. Open version history → See v2
5. Restore v2 → Content restored, now v4, v3 in history

## Done When

- [ ] Content changes create versions
- [ ] Non-content changes (name only) don't create versions
- [ ] Version history shows correctly
- [ ] Restore works
- [ ] Only last 2 versions kept
