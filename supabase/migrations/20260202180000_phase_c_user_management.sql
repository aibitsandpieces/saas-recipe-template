-- Phase C: User Management System
-- This migration adds user invitations and individual course enrollment functionality

-- User invitations table for tracking invitation workflow
CREATE TABLE user_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
    role_name text NOT NULL DEFAULT 'org_member' CHECK (role_name IN ('org_admin', 'org_member')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'failed')),
    clerk_invitation_id text, -- Track Clerk's invitation ID
    courses uuid[] DEFAULT '{}', -- Array of course IDs for individual enrollment
    invited_by uuid REFERENCES users(id) NOT NULL,
    invited_at timestamptz DEFAULT now(),
    accepted_at timestamptz,
    expires_at timestamptz DEFAULT (now() + interval '7 days'),
    UNIQUE(email, organisation_id)
);

-- Individual course enrollments table (supplements org-level enrollment)
CREATE TABLE course_user_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_by uuid REFERENCES users(id) NOT NULL,
    enrolled_at timestamptz DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- User import logs table for tracking CSV import operations
CREATE TABLE user_import_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    total_rows integer NOT NULL,
    successful_invitations integer DEFAULT 0,
    failed_invitations integer DEFAULT 0,
    organisations_processed integer DEFAULT 0,
    individual_enrollments integer DEFAULT 0,
    error_summary jsonb,
    imported_by uuid REFERENCES users(id) NOT NULL,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Indexes for performance
CREATE INDEX user_invitations_email_idx ON user_invitations(email);
CREATE INDEX user_invitations_org_idx ON user_invitations(organisation_id);
CREATE INDEX user_invitations_status_idx ON user_invitations(status);
CREATE INDEX user_invitations_expires_idx ON user_invitations(expires_at);
CREATE INDEX course_user_enrollments_user_idx ON course_user_enrollments(user_id);
CREATE INDEX course_user_enrollments_course_idx ON course_user_enrollments(course_id);
CREATE INDEX user_import_logs_imported_by_idx ON user_import_logs(imported_by);
CREATE INDEX user_import_logs_started_at_idx ON user_import_logs(started_at);

-- Enable Row Level Security
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_invitations
CREATE POLICY "platform_admins_manage_all_invitations" ON user_invitations FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "org_admins_manage_org_invitations" ON user_invitations FOR ALL
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

CREATE POLICY "users_see_own_invitations" ON user_invitations FOR SELECT
TO authenticated USING (
    email = (
        SELECT email FROM users
        WHERE clerk_id = auth.jwt() ->> 'sub'
    )
);

-- RLS Policies for course_user_enrollments
CREATE POLICY "platform_admins_manage_all_enrollments" ON course_user_enrollments FOR ALL
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "org_admins_manage_org_enrollments" ON course_user_enrollments FOR ALL
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    user_id IN (
        SELECT id FROM users
        WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

CREATE POLICY "users_view_own_enrollments" ON course_user_enrollments FOR SELECT
TO authenticated USING (
    user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
);

-- RLS Policies for user_import_logs
CREATE POLICY "platform_admins_view_all_import_logs" ON user_import_logs FOR SELECT
TO authenticated USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "org_admins_view_own_import_logs" ON user_import_logs FOR SELECT
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    imported_by IN (
        SELECT id FROM users
        WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
    )
);

CREATE POLICY "users_view_own_import_logs" ON user_import_logs FOR SELECT
TO authenticated USING (
    imported_by IN (
        SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
);

CREATE POLICY "org_admins_create_import_logs" ON user_import_logs FOR INSERT
TO authenticated WITH CHECK (
    (auth.jwt() ->> 'user_role') IN ('platform_admin', 'org_admin')
);

-- Update course access policies to include individual enrollment
-- Drop existing course view policy to recreate with individual enrollment support
DROP POLICY IF EXISTS "users_view_published_enrolled_courses" ON courses;

CREATE POLICY "users_view_published_enrolled_courses" ON courses FOR SELECT
TO authenticated USING (
    is_published = true AND (
        -- Organization-level enrollment
        id IN (
            SELECT course_id FROM course_org_enrollments
            WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
        )
        OR
        -- Individual enrollment
        id IN (
            SELECT course_id FROM course_user_enrollments
            WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    )
);

-- Update course modules policy to include individual enrollment
DROP POLICY IF EXISTS "users_view_enrolled_modules" ON course_modules;

CREATE POLICY "users_view_enrolled_modules" ON course_modules FOR SELECT
TO authenticated USING (
    course_id IN (
        SELECT c.id FROM courses c
        WHERE c.is_published = true AND (
            -- Organization-level enrollment
            c.id IN (
                SELECT course_id FROM course_org_enrollments
                WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
            )
            OR
            -- Individual enrollment
            c.id IN (
                SELECT course_id FROM course_user_enrollments
                WHERE user_id IN (
                    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
                )
            )
        )
    )
);

-- Update course lessons policy to include individual enrollment
DROP POLICY IF EXISTS "users_view_enrolled_lessons" ON course_lessons;

CREATE POLICY "users_view_enrolled_lessons" ON course_lessons FOR SELECT
TO authenticated USING (
    module_id IN (
        SELECT cm.id FROM course_modules cm
        JOIN courses c ON cm.course_id = c.id
        WHERE c.is_published = true AND (
            -- Organization-level enrollment
            c.id IN (
                SELECT course_id FROM course_org_enrollments
                WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
            )
            OR
            -- Individual enrollment
            c.id IN (
                SELECT course_id FROM course_user_enrollments
                WHERE user_id IN (
                    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
                )
            )
        )
    )
);

-- Update course lesson files policy to include individual enrollment
DROP POLICY IF EXISTS "users_view_enrolled_lesson_files" ON course_lesson_files;

CREATE POLICY "users_view_enrolled_lesson_files" ON course_lesson_files FOR SELECT
TO authenticated USING (
    lesson_id IN (
        SELECT cl.id FROM course_lessons cl
        JOIN course_modules cm ON cl.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        WHERE c.is_published = true AND (
            -- Organization-level enrollment
            c.id IN (
                SELECT course_id FROM course_org_enrollments
                WHERE organisation_id = (auth.jwt() ->> 'org_id')::uuid
            )
            OR
            -- Individual enrollment
            c.id IN (
                SELECT course_id FROM course_user_enrollments
                WHERE user_id IN (
                    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
                )
            )
        )
    )
);

-- Add updated_at trigger for user_invitations
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();