-- Book Workflows System Schema
-- This creates a completely separate workflow system for book-based workflows
-- Global access pattern (not org-scoped like courses, but like workflows)

-- Book Workflow Departments (7 fixed departments)
CREATE TABLE book_workflow_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Book Workflow Categories (linked to departments)
CREATE TABLE book_workflow_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid REFERENCES book_workflow_departments(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(department_id, slug)
);

-- Books (separate from workflows)
CREATE TABLE books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    author text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Book Workflows (main table)
CREATE TABLE book_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES book_workflow_categories(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    content text,
    activity_type text NOT NULL CHECK (activity_type IN ('Create', 'Assess', 'Plan', 'Workshop')),
    problem_goal text NOT NULL CHECK (problem_goal IN ('Grow', 'Optimise', 'Lead', 'Strategise', 'Innovate', 'Understand')),
    is_published boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(book_id, slug)
);

-- Full-text search support
ALTER TABLE book_workflows ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

-- Indexes for performance
CREATE INDEX book_workflow_departments_slug_idx ON book_workflow_departments(slug);
CREATE INDEX book_workflow_departments_sort_idx ON book_workflow_departments(sort_order);
CREATE INDEX book_workflow_categories_dept_idx ON book_workflow_categories(department_id, sort_order);
CREATE INDEX book_workflow_categories_slug_idx ON book_workflow_categories(department_id, slug);
CREATE INDEX books_slug_idx ON books(slug);
CREATE INDEX book_workflows_book_idx ON book_workflows(book_id);
CREATE INDEX book_workflows_category_idx ON book_workflows(category_id);
CREATE INDEX book_workflows_activity_type_idx ON book_workflows(activity_type);
CREATE INDEX book_workflows_problem_goal_idx ON book_workflows(problem_goal);
CREATE INDEX book_workflows_published_idx ON book_workflows(is_published);
CREATE INDEX book_workflows_search_idx ON book_workflows USING GIN(search_vector);
CREATE INDEX book_workflows_slug_idx ON book_workflows(book_id, slug);

-- Enable RLS on all tables
ALTER TABLE book_workflow_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_workflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Global access pattern (all authenticated users can view published)
-- Departments: All authenticated users can view
CREATE POLICY "authenticated_users_view_book_workflow_departments" ON book_workflow_departments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "platform_admins_manage_book_workflow_departments" ON book_workflow_departments
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Categories: All authenticated users can view
CREATE POLICY "authenticated_users_view_book_workflow_categories" ON book_workflow_categories
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "platform_admins_manage_book_workflow_categories" ON book_workflow_categories
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Books: All authenticated users can view
CREATE POLICY "authenticated_users_view_books" ON books
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "platform_admins_manage_books" ON books
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Book Workflows: All authenticated users can view published
CREATE POLICY "authenticated_users_view_published_book_workflows" ON book_workflows
FOR SELECT TO authenticated
USING (is_published = true);

CREATE POLICY "platform_admins_view_all_book_workflows" ON book_workflows
FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "platform_admins_manage_book_workflows" ON book_workflows
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Seed the 7 fixed departments
INSERT INTO book_workflow_departments (name, slug, sort_order) VALUES
    ('Sales', 'sales', 1),
    ('Marketing', 'marketing', 2),
    ('HR / People', 'hr-people', 3),
    ('Finance', 'finance', 4),
    ('Operations', 'operations', 5),
    ('Strategy', 'strategy', 6),
    ('Leadership', 'leadership', 7);

-- Create database function for CSV import
CREATE OR REPLACE FUNCTION import_book_workflows(csv_data jsonb, file_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    row_data jsonb;
    dept_record RECORD;
    cat_record RECORD;
    book_record RECORD;
    workflow_record RECORD;
    dept_slug text;
    cat_slug text;
    book_slug text;
    workflow_slug text;
    created_cats integer := 0;
    created_books integer := 0;
    created_workflows integer := 0;
    errors jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- Process each row
    FOR row_data IN SELECT * FROM jsonb_array_elements(csv_data)
    LOOP
        BEGIN
            -- Generate slugs
            dept_slug := lower(trim(regexp_replace(row_data->>'department', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            cat_slug := lower(trim(regexp_replace(row_data->>'category', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            book_slug := lower(trim(regexp_replace(row_data->>'book', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            workflow_slug := lower(trim(regexp_replace(row_data->>'workflow', '[^a-zA-Z0-9]+', '-', 'g'), '-'));

            -- Find department
            SELECT * INTO dept_record
            FROM book_workflow_departments
            WHERE slug = dept_slug;

            IF NOT FOUND THEN
                errors := errors || jsonb_build_object(
                    'row', row_data,
                    'error', 'Department not found: ' || (row_data->>'department')
                );
                CONTINUE;
            END IF;

            -- Find or create category
            SELECT * INTO cat_record
            FROM book_workflow_categories
            WHERE department_id = dept_record.id AND slug = cat_slug;

            IF NOT FOUND THEN
                INSERT INTO book_workflow_categories (department_id, name, slug)
                VALUES (dept_record.id, row_data->>'category', cat_slug)
                RETURNING * INTO cat_record;
                created_cats := created_cats + 1;
            END IF;

            -- Find or create book
            SELECT * INTO book_record
            FROM books
            WHERE slug = book_slug;

            IF NOT FOUND THEN
                INSERT INTO books (title, slug, author)
                VALUES (row_data->>'book', book_slug, row_data->>'author')
                RETURNING * INTO book_record;
                created_books := created_books + 1;
            END IF;

            -- Check if workflow exists
            SELECT * INTO workflow_record
            FROM book_workflows
            WHERE book_id = book_record.id AND slug = workflow_slug;

            -- Create workflow if it doesn't exist
            IF NOT FOUND THEN
                INSERT INTO book_workflows (
                    book_id,
                    category_id,
                    name,
                    slug,
                    activity_type,
                    problem_goal
                )
                VALUES (
                    book_record.id,
                    cat_record.id,
                    row_data->>'workflow',
                    workflow_slug,
                    row_data->>'activity_type',
                    row_data->>'problem_goal'
                );

                created_workflows := created_workflows + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors || jsonb_build_object(
                'row', row_data,
                'error', SQLERRM
            );
        END;
    END LOOP;

    -- Return results
    result := jsonb_build_object(
        'success', true,
        'file_name', file_name,
        'stats', jsonb_build_object(
            'created_categories', created_cats,
            'created_books', created_books,
            'created_workflows', created_workflows,
            'errors_count', jsonb_array_length(errors)
        ),
        'errors', errors
    );

    RETURN result;
END;
$$;