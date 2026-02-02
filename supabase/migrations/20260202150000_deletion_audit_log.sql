-- Create deletion audit log table
CREATE TABLE deletion_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('delete_course', 'delete_module', 'delete_lesson')),
    entity_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    impact JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('initiated', 'completed', 'failed', 'rolled_back')),
    metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_deletion_audit_log_user_id ON deletion_audit_log(user_id);
CREATE INDEX idx_deletion_audit_log_action ON deletion_audit_log(action);
CREATE INDEX idx_deletion_audit_log_entity_id ON deletion_audit_log(entity_id);
CREATE INDEX idx_deletion_audit_log_created_at ON deletion_audit_log(created_at);
CREATE INDEX idx_deletion_audit_log_status ON deletion_audit_log(status);

-- Enable RLS
ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can see all audit logs
CREATE POLICY "platform_admins_full_access" ON deletion_audit_log
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

-- Regular users cannot access audit logs
CREATE POLICY "regular_users_no_access" ON deletion_audit_log
FOR ALL TO authenticated
USING (false);

-- Add comment
COMMENT ON TABLE deletion_audit_log IS 'Audit trail for deletion operations performed by platform administrators';