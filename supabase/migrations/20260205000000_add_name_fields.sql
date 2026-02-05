-- Add comprehensive name handling with first_name/last_name fields
-- This migration adds separate name fields and implements proper name storage

-- Add first_name and last_name columns to users table
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;

-- Add name field to user_invitations table
ALTER TABLE user_invitations ADD COLUMN name TEXT;

-- Add indexes for performance
CREATE INDEX users_first_name_idx ON users(first_name);
CREATE INDEX users_last_name_idx ON users(last_name);
CREATE INDEX user_invitations_name_idx ON user_invitations(name);

-- Backfill data: split existing names (best effort)
-- This handles simple cases like "John Doe" -> first_name="John", last_name="Doe"
-- For single names like "John", first_name="John", last_name=NULL
UPDATE users
SET
  first_name = TRIM(SPLIT_PART(name, ' ', 1)),
  last_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1
    THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1))
    ELSE NULL
  END
WHERE name IS NOT NULL AND name != '';

-- Update any NULL first_name to empty string for consistency where name exists
UPDATE users
SET first_name = ''
WHERE name IS NOT NULL AND name != '' AND first_name IS NULL;