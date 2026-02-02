# Workflow Storage Setup Instructions

This document outlines the manual storage setup required for the Workflow Library System.

## Supabase Storage Bucket Creation

### 1. Create 'workflows' Storage Bucket

In your Supabase dashboard, navigate to Storage and create a new bucket with these settings:

**Bucket Name:** `workflows`

**Configuration:**
- **Public bucket:** Yes (for easy file access)
- **File size limit:** 10MB
- **Allowed MIME types:**
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `application/vnd.ms-powerpoint`
  - `application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - `text/plain`
  - `text/csv`
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`

### 2. Storage Policies

Create the following RLS policies for the `workflows` bucket:

#### Policy 1: Public Read Access
```sql
CREATE POLICY "Public read access for published workflows" ON storage.objects
FOR SELECT TO public
USING (
    bucket_id = 'workflows' AND
    (storage.foldername(name))[1] IN (
        SELECT w.id::text
        FROM workflows w
        WHERE w.is_published = true
    )
);
```

#### Policy 2: Platform Admin Full Access
```sql
CREATE POLICY "Platform admins have full access" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'workflows' AND
    (auth.jwt() ->> 'user_role') = 'platform_admin'
)
WITH CHECK (
    bucket_id = 'workflows' AND
    (auth.jwt() ->> 'user_role') = 'platform_admin'
);
```

#### Policy 3: Insert Access for Platform Admins
```sql
CREATE POLICY "Platform admins can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'workflows' AND
    (auth.jwt() ->> 'user_role') = 'platform_admin'
);
```

#### Policy 4: Delete Access for Platform Admins
```sql
CREATE POLICY "Platform admins can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'workflows' AND
    (auth.jwt() ->> 'user_role') = 'platform_admin'
);
```

### 3. Directory Structure

The storage bucket will use this directory structure:
```
workflows/
├── [workflow-id]/
│   ├── [uuid].[extension]
│   └── [uuid].[extension]
└── [workflow-id]/
    └── [uuid].[extension]
```

Each workflow gets its own folder identified by the workflow UUID, and files within are given unique names to prevent conflicts.

### 4. Access Patterns

**Public Access:**
- All authenticated users can view files for published workflows
- Files are accessible via both signed URLs and public URLs

**Admin Access:**
- Platform administrators can upload, view, and delete all files
- File uploads are restricted to platform administrators only

**File Security:**
- Files for unpublished workflows are not accessible to regular users
- All file operations go through RLS policies for security
- File validation is enforced on the client side and server side

### 5. Integration

The storage setup integrates with:

- **Database:** `workflow_files` table tracks file metadata
- **Server Actions:** `workflow.actions.ts` and `csv-import.actions.ts`
- **File Upload Utils:** `lib/utils/workflow-file-upload.ts`
- **Components:** Admin interface and public file display components

### 6. Testing

After setup, test the storage functionality:

1. **Upload Test:** Admin should be able to upload files to workflows
2. **Access Test:** Authenticated users should see files for published workflows
3. **Security Test:** Users should NOT access files for unpublished workflows
4. **Download Test:** File download links should work correctly

### 7. Monitoring

Monitor storage usage and consider:
- Setting up storage quotas if needed
- Regular cleanup of orphaned files
- Monitoring for abuse or unusual upload patterns

## Notes

- The `workflows` storage bucket is separate from the existing `courses` bucket
- File validation happens both client-side and server-side
- All file operations are logged via the workflow import system
- Storage paths use UUIDs to prevent conflicts and enhance security