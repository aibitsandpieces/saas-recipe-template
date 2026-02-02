# Phase B: Workflow Library

## Goal
Import hundreds of workflows from CSV. Users can browse and search.

## Build Order

### 1. Database Setup

```sql
workflow_categories (id, name, slug, description, sort_order, created_at)
-- Top level: "Strategy", "Marketing", "Operations", etc.

workflow_departments (id, category_id FK, name, slug, description, sort_order, created_at)
-- Second level: "Corporate Vision & Strategic Planning", etc.

workflows (id, department_id FK, name, slug, summary, description, source_book, source_author, external_url, keywords[], produces, time_estimate_minutes, prerequisites_summary, complexity, is_published, created_at, updated_at)

workflow_files (id, workflow_id FK, file_type, file_name, storage_path, sort_order, created_at, updated_at)
```

Add full-text search on workflows:
```sql
alter table workflows add column search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(source_book, '')), 'C')
) stored;

create index workflows_search_idx on workflows using gin(search_vector);
```

### 2. RLS Policies

- All authenticated users can view published workflows (global library)
- Platform admins have full access

### 3. Storage Bucket

Create `workflows` bucket for workflow files.

### 4. CSV Import

The CSV has columns: `ai mba`, `category`, `topic`, `workflow`, `course`, `author`, `link`

Mapping:
- `ai mba` → category name
- `category` → department name  
- `topic` → workflow name
- `workflow` → content (save as HTML file)
- `course` → source_book
- `author` → source_author
- `link` → external_url

Build in `/admin/workflows/import`:
1. File upload
2. Parse and validate
3. Show preview (categories/departments/workflows to create)
4. Confirm button
5. Import in transaction (all or nothing)
6. Show results

### 5. Browse UI

Build in `/workflows`:
- Category list (home)
- Department list (within category)
- Workflow list (within department)
- Workflow detail (full info + view file)

### 6. Search

- Search bar on workflow pages
- Full-text search using the search_vector
- Results show workflow cards with category/department breadcrumb

## How to Test

1. As platform_admin: Import the CSV → See success message with counts
2. As any user: Browse Strategy → Corporate Vision → See workflows
3. As any user: Search "Rockefeller" → Find relevant workflows
4. View a workflow → See content file

## Done When

- [ ] CSV import works with preview
- [ ] Import is transaction-safe
- [ ] Categories and departments created correctly
- [ ] Workflows searchable
- [ ] Browse hierarchy works
- [ ] Workflow detail shows file content
