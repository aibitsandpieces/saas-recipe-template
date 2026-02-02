-- Migration: Create function for batch invitation processing
-- This enables atomic batch operations for CSV imports

CREATE OR REPLACE FUNCTION create_batch_invitations(
  p_invitations JSONB
) RETURNS TABLE (
  success_count INTEGER,
  failed_count INTEGER,
  created_invitation_ids UUID[]
) AS $$
DECLARE
  v_invitation JSONB;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_created_ids UUID[] := '{}';
  v_invitation_id UUID;
BEGIN
  -- Process each invitation in the batch
  FOR v_invitation IN SELECT * FROM jsonb_array_elements(p_invitations)
  LOOP
    BEGIN
      -- Insert invitation record
      INSERT INTO user_invitations (
        email,
        organisation_id,
        role_name,
        clerk_invitation_id,
        courses,
        invited_by,
        expires_at,
        status,
        created_at
      ) VALUES (
        (v_invitation ->> 'email')::TEXT,
        (v_invitation ->> 'organisation_id')::UUID,
        (v_invitation ->> 'role_name')::TEXT,
        (v_invitation ->> 'clerk_invitation_id')::TEXT,
        COALESCE((v_invitation -> 'courses')::JSONB, '[]'::JSONB),
        (v_invitation ->> 'invited_by')::UUID,
        (v_invitation ->> 'expires_at')::TIMESTAMPTZ,
        'pending',
        NOW()
      ) RETURNING id INTO v_invitation_id;

      -- Track success
      v_success_count := v_success_count + 1;
      v_created_ids := array_append(v_created_ids, v_invitation_id);

    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but continue processing
        RAISE WARNING 'Failed to create invitation for %: %',
          v_invitation ->> 'email', SQLERRM;
        v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT v_success_count, v_failed_count, v_created_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a function to rollback invitations if needed
CREATE OR REPLACE FUNCTION rollback_invitations(
  p_invitation_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_id UUID;
BEGIN
  -- Delete each invitation
  FOREACH v_id IN ARRAY p_invitation_ids
  LOOP
    DELETE FROM user_invitations WHERE id = v_id;
    IF FOUND THEN
      v_deleted_count := v_deleted_count + 1;
    END IF;
  END LOOP;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;