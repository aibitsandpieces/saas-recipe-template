# Phase B2: Book Workflows

## Goal
Create a separate Book Workflows section. Import 3,243 workflows from CSV. Users can browse by department/category/book or filter by activity type and problem/goal.

## Context

This is a **new, independent section** - not a modification of the existing Workflows section. Book Workflows are AI-assisted prompts distilled from business books (~9 workflows per book, several hundred books).

The existing Workflows section (Phase B) remains unchanged.

## Build Order

### 1. Database Setup

Create these tables (completely separate from existing workflow tables):

```sql
-- Departments (7 fixed options)
book_workflow_departments (
  id uuid primary key,
  name text unique not null,
  slug text unique not null,
  sort_order integer default 0,
  created_at timestamptz default now()
)

-- Categories within departments
book_workflow_categories (
  id uuid primary key,
  department_id uuid references book_workflow_departments on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(department_id, slug)
)

-- Books
books (
  id uuid primary key,
  title text not null,
  slug text unique not null,
  author text not null,
  created_at timestamptz default now()
)

-- The workflows themselves
book_workflows (
  id uuid primary key,
  book_id uuid references books on delete cascade,
  category_id uuid references book_workflow_categories on delete cascade,
  name text not null,
  slug text not null,
  content text,
  activity_type text not null,
  problem_goal text not null,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(book_id, slug)
)
```

**Activity Type values:** Create, Assess, Plan, Workshop

**Problem/Goal values:** Grow, Optimise, Lead, Strategise, Innovate, Understand

**Department seed data (7 departments):**
- Sales
- Marketing
- HR / People
- Operations
- Finance / Admin
- Strategy
- Product / Innovation

Add full-text search:
```sql
alter table book_workflows add column search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
) stored;

create index book_workflows_search_idx on book_workflows using gin(search_vector);
```

### 2. RLS Policies

- All authenticated users can view published book_workflows (global access, like Workflows)
- Platform admins have full access to all tables

### 3. CSV Import

**CSV columns:** `department`, `category`, `book`, `author`, `workflow`, `activity_type`, `problem_goal`

**Mapping:**
- `department` → Find or create in book_workflow_departments
- `category` → Find or create in book_workflow_categories (linked to department)
- `book` + `author` → Find or create in books table
- `workflow` → book_workflows.name
- `activity_type` → Must be one of: Create, Assess, Plan, Workshop
- `problem_goal` → Must be one of: Grow, Optimise, Lead, Strategise, Innovate, Understand

**Note:** This CSV does not have a `content` column. The workflow name IS the content for now. Leave content field empty or duplicate the name.

Build in `/admin/book-workflows/import`:
1. File upload
2. Parse and validate
3. Show preview:
   - Total workflows to import
   - Departments to create
   - Categories to create
   - Books to create
   - Any validation errors (invalid activity_type or problem_goal values)
4. Confirm button
5. Import in transaction (all or nothing)
6. Show results

### 4. Browse UI

Build in `/book-workflows`:

**Home** (`/book-workflows`)
- List of 7 departments
- Show workflow count per department
- Search bar at top

**Department View** (`/book-workflows/[department-slug]`)
- Department name
- List of categories within this department
- Show workflow count per category

**Category View** (`/book-workflows/[department-slug]/[category-slug]`)
- Breadcrumb: Book Workflows > Department > Category
- List of books that have workflows in this category
- Show workflow count per book

**Book View** (`/book-workflows/[department-slug]/[category-slug]/[book-slug]`)
- Breadcrumb: Book Workflows > Department > Category > Book
- Book title and author
- List of workflows from this book in this category
- Each workflow shows: name, activity type badge, problem/goal badge

**Workflow Detail** (`/book-workflows/[department-slug]/[category-slug]/[book-slug]/[workflow-slug]`)
- Full workflow display
- Activity type and problem/goal badges
- Book and author info
- Back navigation

### 5. Filter UI

On the main `/book-workflows` page, add filter options:

**Filter by Activity Type:**
- All
- Create
- Assess
- Plan
- Workshop

**Filter by Problem/Goal:**
- All
- Grow
- Optimise
- Lead
- Strategise
- Innovate
- Understand

When filters are active, show a flat list of matching workflows (skip the department/category/book hierarchy).

### 6. Search

- Search bar on book-workflows pages
- Full-text search on workflow name and content
- Results show workflow cards with department/category/book context

### 7. Navigation

Add "Book Workflows" to the main navigation:
- Header: Courses | Workflows | Book Workflows
- Admin sidebar: Add "Book Workflows" section with Import link

### 8. Admin - Delete Capability

Build in `/admin/book-workflows`:
- List view with counts (departments, categories, books, workflows)
- "Delete All" button with confirmation (for re-importing)
- Individual delete for workflows if time permits

## How to Test

### Test 1: CSV Import

**Log in as:** platform_admin

1. Create a test CSV file `test-book-workflows.csv`:

```csv
department,category,book,author,workflow,activity_type,problem_goal
Sales,Prospecting & Lead Generation,SPIN Selling,Neil Rackham,Need-Payoff Proposition Builder,Create,Grow
Sales,Prospecting & Lead Generation,SPIN Selling,Neil Rackham,Situation Question Bank,Create,Grow
Sales,Prospecting & Lead Generation,SPIN Selling,Neil Rackham,Pipeline Health Assessment,Assess,Grow
Marketing,Content Strategy,Content Inc,Joe Pulizzi,Blog Post Generator,Create,Understand
Marketing,Content Strategy,Content Inc,Joe Pulizzi,Content Calendar Planning,Plan,Understand
HR / People,Performance Management,Radical Candor,Kim Scott,Feedback Conversation Guide,Create,Lead
HR / People,Performance Management,Radical Candor,Kim Scott,Performance Review Template,Create,Lead
Strategy,Corporate Vision,Good to Great,Jim Collins,Hedgehog Concept Workshop,Workshop,Strategise
Strategy,Corporate Vision,Good to Great,Jim Collins,Vision Statement Crafter,Create,Strategise
```

2. Go to `/admin/book-workflows/import`
3. Upload the CSV
4. Preview should show:
   - 9 workflows
   - 4 departments (Sales, Marketing, HR / People, Strategy)
   - 4 categories
   - 4 books
5. Confirm import
6. See success message

**Pass if:** Preview is accurate, import succeeds.

### Test 2: Browse Hierarchy

**Log in as:** Coral Clam (org_member)

1. Go to `/book-workflows`
2. See departments (Sales, Marketing, HR / People, Strategy)
3. Click **Sales**
4. See **Prospecting & Lead Generation** category
5. Click it
6. See **SPIN Selling** book
7. Click it
8. See 3 workflows: Need-Payoff Proposition Builder, Situation Question Bank, Pipeline Health Assessment
9. Each shows activity type and problem/goal badges
10. Click **Need-Payoff Proposition Builder**
11. See full workflow detail

**Pass if:** Full browse path works.

### Test 3: Filters Work

**Log in as:** Shelly Starfish (org_member)

1. Go to `/book-workflows`
2. Select Activity Type: **Assess**
3. Should see only "Pipeline Health Assessment"
4. Clear filter
5. Select Problem/Goal: **Lead**
6. Should see "Feedback Conversation Guide" and "Performance Review Template"
7. Select Activity Type: **Workshop** AND Problem/Goal: **Strategise**
8. Should see only "Hedgehog Concept Workshop"

**Pass if:** Filters return correct results.

### Test 4: Search Works

1. Go to `/book-workflows`
2. Search for **"SPIN"**
3. Should see the 3 SPIN Selling workflows
4. Search for **"Collins"**
5. Should see the Good to Great workflows

**Pass if:** Search returns relevant results.

### Test 5: Navigation Works

1. Check header has **Book Workflows** link
2. Click it - goes to `/book-workflows`
3. As platform_admin, check admin area has Book Workflows section
4. Import link works

**Pass if:** Can navigate without typing URLs.

### Test 6: Delete and Re-import

**Log in as:** platform_admin

1. Go to `/admin/book-workflows`
2. Click "Delete All"
3. Confirm
4. All book workflows, books, categories removed (departments can stay)
5. Re-import the test CSV
6. Data is back

**Pass if:** Can cleanly reset and re-import.

## Done When

- [ ] Database tables created (separate from existing workflows)
- [ ] RLS policies working (global access for authenticated users)
- [ ] CSV import works with preview
- [ ] Import is transaction-safe
- [ ] Departments, categories, books created correctly
- [ ] Activity type and problem/goal validated on import
- [ ] Browse hierarchy works (Department → Category → Book → Workflow)
- [ ] Filters work (activity type, problem/goal)
- [ ] Search works
- [ ] Navigation includes Book Workflows
- [ ] Delete all functionality works
- [ ] Coral and Shelly can both access (global, not org-scoped)

## Files to Create

```
app/
├── (authenticated)/
│   ├── book-workflows/
│   │   ├── page.tsx                              # Department list + filters
│   │   └── [departmentSlug]/
│   │       ├── page.tsx                          # Category list
│   │       └── [categorySlug]/
│   │           ├── page.tsx                      # Book list
│   │           └── [bookSlug]/
│   │               ├── page.tsx                  # Workflow list
│   │               └── [workflowSlug]/
│   │                   └── page.tsx              # Workflow detail
│   └── admin/
│       └── book-workflows/
│           ├── page.tsx                          # Admin overview + delete
│           └── import/
│               └── page.tsx                      # CSV import

lib/
├── actions/
│   └── book-workflow.actions.ts                  # All book workflow actions
└── types/
    └── book-workflow.ts                          # TypeScript types

supabase/
└── migrations/
    └── XXX_book_workflows.sql                    # Schema for book workflows
```

## Notes

- This is completely separate from the existing Workflows section
- Activity type and problem/goal are required fields - reject CSV rows missing them
- The 7 departments are fixed - seed them in the migration
- Books can appear in multiple categories (same book, different workflows per category)
- Keep the URL structure flat enough to be readable but hierarchical for navigation
