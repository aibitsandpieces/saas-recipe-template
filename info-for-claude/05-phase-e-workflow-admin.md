# Phase E: Workflow Admin

## Goal
Platform admins can create, edit, delete workflows via UI. File versioning (keep last 10).

## Build Order

### 1. Database Setup

```sql
workflow_file_versions (id, workflow_file_id FK, version_number, storage_path, created_at, created_by FK)

-- Add to workflow_files:
alter table workflow_files add column current_version integer default 1;
```

### 2. Admin UI

Build in `/admin/workflows`:

**Workflow List**
- Filter by category/department
- Search by name
- Table with edit/delete actions
- "New Workflow" button

**Workflow Editor**
- Basic info: name, slug, category (dropdown), department (dropdown)
- Source info: source_book, source_author, external_url
- Additional: keywords, produces, time_estimate, prerequisites, complexity, published toggle
- Files section: list files, upload, set type, reorder, delete
- Version history per file

**Category/Department Creation**
- Add "+ Create New" option in category dropdown
- Add "+ Create New" option in department dropdown (dependent on category)

### 3. File Versioning

Same pattern as lessons but keep 10 versions:
- On file replace: save current to versions, upload new
- On restore: save current, copy old version to current path
- Clean up versions beyond 10

### 4. File Types

Dropdown options for file_type:
- full-workflow
- start-here
- process-agent
- process-consultant
- context
- example
- quality
- quick-start

## How to Test

1. Create workflow manually with category/department
2. Upload a file → Set type → Save
3. Replace file → Check version history shows v1
4. Restore v1 → Content restored, now v3
5. Delete workflow → Files removed from storage

## Done When

- [ ] Workflow CRUD works
- [ ] Can create categories/departments inline
- [ ] File upload works
- [ ] File type selection works
- [ ] File replacement creates versions
- [ ] Version history shows up to 10
- [ ] Restore works
- [ ] Delete cascades to files and storage
