-- ==============================================================================
-- CloudShare Phase 5: Supabase Storage Bucket & Object Access Policies
-- Migration: 20261114213000_create_storage_bucket.sql
--
-- Security Specifications:
-- 1. Private bucket 'user-files' with public access disabled (public = false).
-- 2. Bucket-level 50 MiB file size limit (52,428,800 bytes).
-- 3. Storage path structure: {user_id}/{file_id}/{file_name}
-- 4. Multi-tenant isolation enforced via storage.objects RLS policies:
--    Users can ONLY read, upload, modify, or delete objects where the root
--    folder prefix matches their authenticated user UUID (auth.uid()::text).
-- 5. Zero anonymous access: Anonymous roles have NO access to 'user-files'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROVISION PRIVATE STORAGE BUCKET
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-files',
    'user-files',
    false,
    52428800, -- 50 MiB in bytes
    NULL      -- Allows all valid file types validated at the application boundary
)
ON CONFLICT (id) DO UPDATE
SET
    public = false,
    file_size_limit = 52428800;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON STORAGE OBJECTS
-- ------------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. STORAGE OBJECT ACCESS POLICIES
-- ------------------------------------------------------------------------------

-- Policy 1: Authenticated users can read only their own storage objects
DROP POLICY IF EXISTS "Users can read own storage objects" ON storage.objects;
CREATE POLICY "Users can read own storage objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'user-files'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );

-- Policy 2: Authenticated users can upload storage objects only to their own folder prefix
DROP POLICY IF EXISTS "Users can upload own storage objects" ON storage.objects;
CREATE POLICY "Users can upload own storage objects"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'user-files'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );

-- Policy 3: Authenticated users can update only their own storage objects
DROP POLICY IF EXISTS "Users can update own storage objects" ON storage.objects;
CREATE POLICY "Users can update own storage objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'user-files'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    )
    WITH CHECK (
        bucket_id = 'user-files'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );

-- Policy 4: Authenticated users can delete only their own storage objects
DROP POLICY IF EXISTS "Users can delete own storage objects" ON storage.objects;
CREATE POLICY "Users can delete own storage objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'user-files'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );
