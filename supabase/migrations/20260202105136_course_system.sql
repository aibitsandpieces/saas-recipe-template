-- Course System Database Schema
-- This creates the complete course management system for AI Potential Portal

-- Main courses table
CREATE TABLE courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    thumbnail_url text,
    is_published boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Course modules (organize lessons into sections)
CREATE TABLE course_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Individual lessons within modules
CREATE TABLE course_lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    html_content text,
    vimeo_embed_code text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(module_id, slug)
);

-- File attachments for lessons
CREATE TABLE course_lesson_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE NOT NULL,
    file_name text NOT NULL,
    display_name text NOT NULL,
    storage_path text NOT NULL,
    file_size_bytes bigint,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Organization-level course enrollments
CREATE TABLE course_org_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
    enrolled_at timestamptz DEFAULT now(),
    enrolled_by uuid REFERENCES users(id),
    UNIQUE(course_id, organisation_id)
);

-- Individual user progress tracking
CREATE TABLE course_user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE NOT NULL,
    completed_at timestamptz,
    last_accessed_at timestamptz DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX courses_published_idx ON courses(is_published);
CREATE INDEX course_modules_course_idx ON course_modules(course_id, sort_order);
CREATE INDEX course_lessons_module_idx ON course_lessons(module_id, sort_order);
CREATE INDEX course_lesson_files_lesson_idx ON course_lesson_files(lesson_id, sort_order);
CREATE INDEX course_org_enrollments_course_idx ON course_org_enrollments(course_id);
CREATE INDEX course_org_enrollments_org_idx ON course_org_enrollments(organisation_id);
CREATE INDEX course_user_progress_user_idx ON course_user_progress(user_id);
CREATE INDEX course_user_progress_lesson_idx ON course_user_progress(lesson_id);

-- Enable Row Level Security on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lesson_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_org_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "platform_admins_manage_courses" ON courses FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_view_published_enrolled_courses" ON courses FOR SELECT
TO authenticated USING (
    is_published = true AND
    id IN (
        SELECT course_id FROM course_org_enrollments
        WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

-- RLS Policies for course_modules
CREATE POLICY "platform_admins_manage_modules" ON course_modules FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_view_enrolled_modules" ON course_modules FOR SELECT
TO authenticated USING (
    course_id IN (
        SELECT c.id FROM courses c
        JOIN course_org_enrollments coe ON c.id = coe.course_id
        WHERE c.is_published = true
        AND coe.organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

-- RLS Policies for course_lessons
CREATE POLICY "platform_admins_manage_lessons" ON course_lessons FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_view_enrolled_lessons" ON course_lessons FOR SELECT
TO authenticated USING (
    module_id IN (
        SELECT cm.id FROM course_modules cm
        JOIN courses c ON cm.course_id = c.id
        JOIN course_org_enrollments coe ON c.id = coe.course_id
        WHERE c.is_published = true
        AND coe.organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

-- RLS Policies for course_lesson_files
CREATE POLICY "platform_admins_manage_lesson_files" ON course_lesson_files FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_view_enrolled_lesson_files" ON course_lesson_files FOR SELECT
TO authenticated USING (
    lesson_id IN (
        SELECT cl.id FROM course_lessons cl
        JOIN course_modules cm ON cl.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        JOIN course_org_enrollments coe ON c.id = coe.course_id
        WHERE c.is_published = true
        AND coe.organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

-- RLS Policies for course_org_enrollments
CREATE POLICY "platform_admins_manage_enrollments" ON course_org_enrollments FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "org_admins_view_own_enrollments" ON course_org_enrollments FOR SELECT
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

-- RLS Policies for course_user_progress
CREATE POLICY "platform_admins_view_all_progress" ON course_user_progress FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_manage_own_progress" ON course_user_progress FOR ALL
TO authenticated USING (
    user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
);

CREATE POLICY "org_admins_view_org_progress" ON course_user_progress FOR SELECT
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    user_id IN (
        SELECT id FROM users
        WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at
    BEFORE UPDATE ON course_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();