-- Workflow Library System Database Schema
-- This creates a comprehensive workflow library with global access for published workflows
-- Unlike courses (org-scoped), workflows are globally accessible when published

-- Workflow categories (top-level organization)
CREATE TABLE workflow_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Workflow departments (second-level organization within categories)
CREATE TABLE workflow_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES workflow_categories(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Individual workflows with full-text search capabilities
CREATE TABLE workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid REFERENCES workflow_departments(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    ai_mba text, -- Mapped from CSV "ai mba" field
    topic text,
    source_book text, -- Mapped from CSV "course" field
    source_author text, -- Mapped from CSV "author" field
    external_url text, -- Mapped from CSV "link" field
    is_published boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- Full-text search vector with weighted fields
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(ai_mba, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(topic, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(source_author, '')), 'D')
    ) STORED
);

-- File attachments for workflows (stored in Supabase Storage)
CREATE TABLE workflow_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    file_name text NOT NULL,
    display_name text NOT NULL,
    storage_path text NOT NULL, -- Path in Supabase Storage
    file_size_bytes bigint,
    content_type text,
    sort_order integer DEFAULT 0,
    uploaded_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

-- CSV import audit log for tracking bulk operations
CREATE TABLE workflow_import_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    total_rows integer NOT NULL,
    successful_rows integer NOT NULL,
    failed_rows integer NOT NULL,
    categories_created integer DEFAULT 0,
    departments_created integer DEFAULT 0,
    workflows_created integer DEFAULT 0,
    error_summary jsonb, -- Store validation errors
    imported_by uuid REFERENCES users(id),
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Performance indexes
CREATE INDEX workflow_categories_sort_idx ON workflow_categories(sort_order);
CREATE INDEX workflow_departments_category_idx ON workflow_departments(category_id, sort_order);
CREATE INDEX workflow_departments_sort_idx ON workflow_departments(sort_order);
CREATE INDEX workflows_department_idx ON workflows(department_id, sort_order);
CREATE INDEX workflows_published_idx ON workflows(is_published);
CREATE INDEX workflows_search_idx ON workflows USING GIN(search_vector);
CREATE INDEX workflow_files_workflow_idx ON workflow_files(workflow_id, sort_order);
CREATE INDEX workflow_import_logs_user_idx ON workflow_import_logs(imported_by);
CREATE INDEX workflow_import_logs_date_idx ON workflow_import_logs(started_at);

-- Enable Row Level Security on all tables
ALTER TABLE workflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_categories
-- Platform admins can manage all categories
CREATE POLICY "platform_admins_manage_categories" ON workflow_categories FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- All authenticated users can view categories (global access)
CREATE POLICY "users_view_categories" ON workflow_categories FOR SELECT
TO authenticated USING (true);

-- RLS Policies for workflow_departments
-- Platform admins can manage all departments
CREATE POLICY "platform_admins_manage_departments" ON workflow_departments FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- All authenticated users can view departments (global access)
CREATE POLICY "users_view_departments" ON workflow_departments FOR SELECT
TO authenticated USING (true);

-- RLS Policies for workflows
-- Platform admins can manage all workflows
CREATE POLICY "platform_admins_manage_workflows" ON workflows FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- All authenticated users can view published workflows (global access)
CREATE POLICY "users_view_published_workflows" ON workflows FOR SELECT
TO authenticated USING (is_published = true);

-- RLS Policies for workflow_files
-- Platform admins can manage all files
CREATE POLICY "platform_admins_manage_workflow_files" ON workflow_files FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Users can view files for published workflows (global access)
CREATE POLICY "users_view_published_workflow_files" ON workflow_files FOR SELECT
TO authenticated USING (
    workflow_id IN (
        SELECT id FROM workflows WHERE is_published = true
    )
);

-- RLS Policies for workflow_import_logs
-- Platform admins can view all import logs
CREATE POLICY "platform_admins_view_import_logs" ON workflow_import_logs FOR SELECT
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Users can only see their own import logs
CREATE POLICY "users_view_own_import_logs" ON workflow_import_logs FOR SELECT
TO authenticated USING (
    imported_by IN (
        SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
);

-- Platform admins can create import logs
CREATE POLICY "platform_admins_create_import_logs" ON workflow_import_logs FOR INSERT
TO authenticated WITH CHECK ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Platform admins can update import logs
CREATE POLICY "platform_admins_update_import_logs" ON workflow_import_logs FOR UPDATE
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Updated_at triggers (reuse existing function)
CREATE TRIGGER update_workflow_categories_updated_at
    BEFORE UPDATE ON workflow_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_departments_updated_at
    BEFORE UPDATE ON workflow_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed some initial categories for testing
INSERT INTO workflow_categories (name, description, sort_order) VALUES
    ('Strategy', 'Strategic planning and business development workflows', 10),
    ('Marketing', 'Marketing campaigns and customer engagement workflows', 20),
    ('Operations', 'Operational processes and efficiency workflows', 30),
    ('Finance', 'Financial management and reporting workflows', 40),
    ('Human Resources', 'People management and organizational workflows', 50);

-- Seed some initial departments
INSERT INTO workflow_departments (category_id, name, description, sort_order) VALUES
    -- Strategy departments
    ((SELECT id FROM workflow_categories WHERE name = 'Strategy'), 'Business Planning', 'Long-term strategic planning processes', 10),
    ((SELECT id FROM workflow_categories WHERE name = 'Strategy'), 'Competitive Analysis', 'Market research and competitor evaluation', 20),

    -- Marketing departments
    ((SELECT id FROM workflow_categories WHERE name = 'Marketing'), 'Content Marketing', 'Content creation and distribution workflows', 10),
    ((SELECT id FROM workflow_categories WHERE name = 'Marketing'), 'Digital Advertising', 'Online advertising campaign management', 20),

    -- Operations departments
    ((SELECT id FROM workflow_categories WHERE name = 'Operations'), 'Process Improvement', 'Operational efficiency and optimization', 10),
    ((SELECT id FROM workflow_categories WHERE name = 'Operations'), 'Quality Management', 'Quality assurance and control processes', 20);