-- Fix RLS Policy Circular Reference in user_roles table
--
-- Problem: The existing "users_see_own_roles" policy creates a circular reference
-- when used in nested queries like user_roles(role:roles(name)), causing query failures.
--
-- Solution: Replace the policy with a more efficient version that avoids circular
-- references while maintaining the same security guarantees.

-- Drop the problematic policy with circular reference
DROP POLICY IF EXISTS "users_see_own_roles" ON user_roles;

-- Create new policy using more efficient approach
-- This avoids circular reference by using a simpler subquery structure
CREATE POLICY "users_see_own_roles_v2" ON user_roles FOR SELECT
TO authenticated USING (
  -- Allow users to see their own roles by matching user_id
  -- This uses a single subquery without circular reference
  user_id = (
    SELECT id FROM users
    WHERE clerk_id = (auth.jwt() ->> 'sub')
    LIMIT 1
  )
  -- Platform admins can see all roles
  OR (auth.jwt() ->> 'user_role') = 'platform_admin'
);

-- Verify the policy was created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_roles' AND policyname = 'users_see_own_roles_v2';