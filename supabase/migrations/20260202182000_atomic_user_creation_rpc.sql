-- Migration: Create RPC function for atomic user creation with role and enrollments
-- This prevents race conditions in webhook processing

CREATE OR REPLACE FUNCTION create_user_with_role_and_enrollments(
  p_clerk_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_organisation_id UUID,
  p_role_name TEXT,
  p_invitation_id UUID DEFAULT NULL,
  p_course_ids TEXT[] DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
  v_result JSON;
  v_course_id TEXT;
BEGIN
  -- Start transaction (implicit in function)

  -- Create user record
  INSERT INTO users (clerk_id, email, name, organisation_id)
  VALUES (p_clerk_id, p_email, p_name, p_organisation_id)
  RETURNING id INTO v_user_id;

  -- Assign role if organisation is provided
  IF p_organisation_id IS NOT NULL THEN
    -- Get role ID
    SELECT id INTO v_role_id
    FROM roles
    WHERE name = p_role_name;

    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'Role % not found', p_role_name;
    END IF;

    -- Assign role to user
    INSERT INTO user_roles (user_id, role_id, organisation_id)
    VALUES (v_user_id, v_role_id, p_organisation_id);

    -- Process course enrollments if provided
    IF array_length(p_course_ids, 1) > 0 THEN
      FOREACH v_course_id IN ARRAY p_course_ids
      LOOP
        INSERT INTO course_user_enrollments (user_id, course_id, enrolled_by)
        VALUES (v_user_id, v_course_id::UUID,
                COALESCE((SELECT invited_by FROM user_invitations WHERE id = p_invitation_id), v_user_id));
      END LOOP;
    END IF;

    -- Update invitation status if provided
    IF p_invitation_id IS NOT NULL THEN
      UPDATE user_invitations
      SET status = 'accepted',
          accepted_at = NOW()
      WHERE id = p_invitation_id;
    END IF;
  END IF;

  -- Return user data
  SELECT json_build_object(
    'id', v_user_id,
    'clerk_id', p_clerk_id,
    'email', p_email,
    'name', p_name,
    'organisation_id', p_organisation_id
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will be rolled back automatically
    RAISE EXCEPTION 'User creation transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;