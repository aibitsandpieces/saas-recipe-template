-- Migration: Fix RLS policy vulnerability in user_invitations table
-- This fixes a critical security issue where users could view invitation data across organizations

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "users_see_own_invitations" ON user_invitations;

-- Create a secure policy that includes organization scope checking
CREATE POLICY "users_see_own_invitations_secure" ON user_invitations FOR SELECT
TO authenticated USING (
    -- User can see invitations sent to their email address
    email = (
        SELECT email FROM users
        WHERE clerk_id = auth.jwt() ->> 'sub'
    )
    AND
    -- Only within their organization scope
    organisation_id = (auth.jwt() ->> 'org_id')::uuid
);

-- Also ensure org admins can see all invitations in their organization
CREATE POLICY "org_admins_see_org_invitations" ON user_invitations FOR SELECT
TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'org_admin' AND
    organisation_id = (auth.jwt() ->> 'org_id')::uuid
);