-- Multi-tenant database schema migration
-- This migration implements a complete multi-tenant system with organisations,
-- user management, and 3-role RBAC (platform_admin, org_admin, org_member)

-- Clean slate: Remove existing test data
TRUNCATE recipes, comments, recipes_unlocked CASCADE;

-- Core multi-tenant tables
CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX users_clerk_id_idx ON users(clerk_id);
CREATE INDEX users_organisation_id_idx ON users(organisation_id);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text
);

-- Seed the three roles
INSERT INTO roles (name, description) VALUES
  ('platform_admin', 'Full platform access'),
  ('org_admin', 'Organisation administrator'),
  ('org_member', 'Standard organisation member');

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id, organisation_id)
);

CREATE INDEX user_roles_user_id_idx ON user_roles(user_id);

-- Add organisation_id to existing tables
ALTER TABLE recipes ADD COLUMN organisation_id uuid REFERENCES organisations(id);
ALTER TABLE comments ADD COLUMN organisation_id uuid REFERENCES organisations(id);
ALTER TABLE recipes_unlocked ADD COLUMN organisation_id uuid REFERENCES organisations(id);

-- Enable RLS on new tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies Using JWT Claims for Performance

-- ORGANISATIONS POLICIES
CREATE POLICY "platform_admins_see_all_orgs" ON organisations FOR ALL
TO authenticated USING ((auth.jwt() ->> 'role') = 'platform_admin');

CREATE POLICY "users_see_own_org" ON organisations FOR SELECT
TO authenticated USING (id = (auth.jwt() ->> 'org_id')::uuid);

-- USERS POLICIES
CREATE POLICY "users_see_own_record" ON users FOR SELECT
TO authenticated USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "platform_admins_manage_all_users" ON users FOR ALL
TO authenticated USING ((auth.jwt() ->> 'role') = 'platform_admin');

CREATE POLICY "org_admins_see_org_users" ON users FOR SELECT
TO authenticated USING (
  (auth.jwt() ->> 'role') = 'org_admin'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

-- ROLES POLICIES
CREATE POLICY "authenticated_users_see_roles" ON roles FOR SELECT
TO authenticated USING (true);

-- USER_ROLES POLICIES
CREATE POLICY "users_see_own_roles" ON user_roles FOR SELECT
TO authenticated USING (user_id IN (
  SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
));

CREATE POLICY "platform_admins_manage_all_roles" ON user_roles FOR ALL
TO authenticated USING ((auth.jwt() ->> 'role') = 'platform_admin');

CREATE POLICY "org_admins_manage_org_roles" ON user_roles FOR ALL
TO authenticated USING (
  (auth.jwt() ->> 'role') = 'org_admin'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

-- RECIPES POLICIES (Updated for multi-tenant)
DROP POLICY IF EXISTS "All users can see the recipes" ON recipes;
DROP POLICY IF EXISTS "Authenticated users can create/modify only own recipes" ON recipes;

CREATE POLICY "org_members_see_org_recipes" ON recipes FOR SELECT
TO authenticated USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "users_create_own_recipes" ON recipes FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.jwt() ->> 'sub'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

CREATE POLICY "users_edit_own_recipes" ON recipes FOR UPDATE
TO authenticated USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "users_delete_own_recipes" ON recipes FOR DELETE
TO authenticated USING (user_id = auth.jwt() ->> 'sub');

-- COMMENTS POLICIES (Updated for multi-tenant)
DROP POLICY IF EXISTS "Authenticated users can see all comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create/modify only own comments" ON comments;

CREATE POLICY "org_members_see_org_comments" ON comments FOR SELECT
TO authenticated USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "users_create_own_comments" ON comments FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.jwt() ->> 'sub'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

CREATE POLICY "users_edit_own_comments" ON comments FOR UPDATE
TO authenticated USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "users_delete_own_comments" ON comments FOR DELETE
TO authenticated USING (user_id = auth.jwt() ->> 'sub');

-- RECIPES_UNLOCKED POLICIES (Updated for multi-tenant)
DROP POLICY IF EXISTS "Users can see their own unlocked recipes" ON recipes_unlocked;
DROP POLICY IF EXISTS "Users can unlock recipes for themselves" ON recipes_unlocked;

CREATE POLICY "org_members_see_org_unlocked" ON recipes_unlocked FOR SELECT
TO authenticated USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "users_unlock_recipes" ON recipes_unlocked FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.jwt() ->> 'sub'
  AND organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_organisations_updated_at
    BEFORE UPDATE ON organisations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();