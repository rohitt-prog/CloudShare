-- ==============================================================================
-- CloudShare / CloudVault: Base Database Schema Migration
-- Migration ID: 20261114191500_create_base_schema.sql
-- Description: Creates profiles, files, and share_links tables with hardened
--              RLS, column-level privileges, and secure triggers.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1 PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile information extending auth.users';
COMMENT ON COLUMN public.profiles.id IS 'Primary key matching auth.users.id';
COMMENT ON COLUMN public.profiles.full_name IS 'User display name extracted from auth metadata';
COMMENT ON COLUMN public.profiles.email IS 'User primary email address';

-- ------------------------------------------------------------------------------
-- 2.2 FILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_files_id_owner UNIQUE (id, owner_id)
);

COMMENT ON TABLE public.files IS 'Metadata registry for private user files in object storage';
COMMENT ON COLUMN public.files.id IS 'Unique file UUID';
COMMENT ON COLUMN public.files.owner_id IS 'Owner auth.users UUID';
COMMENT ON COLUMN public.files.storage_path IS 'Unique path within private storage bucket';
COMMENT ON COLUMN public.files.file_size IS 'Size of file in bytes (must be positive)';

-- ------------------------------------------------------------------------------
-- 2.3 SHARE_LINKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_share_links_file_owner FOREIGN KEY (file_id, owner_id)
        REFERENCES public.files (id, owner_id) ON DELETE CASCADE,
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT chk_revoked_after_created CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

COMMENT ON TABLE public.share_links IS 'Time-limited, revocable share link tokens for files';
COMMENT ON COLUMN public.share_links.token_hash IS 'Cryptographic hash (e.g. SHA-256) of the sharing token (never plaintext)';
COMMENT ON COLUMN public.share_links.expires_at IS 'Mandatory expiration timestamp';
COMMENT ON COLUMN public.share_links.revoked_at IS 'Explicit revocation timestamp, if cancelled by owner';

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON public.files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON public.files(storage_path);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_links_file_id ON public.share_links(file_id);
CREATE INDEX IF NOT EXISTS idx_share_links_owner_id ON public.share_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token_hash ON public.share_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON public.share_links(expires_at);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4.1 PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can read only their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Authenticated users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- (Profile insertion is handled strictly by the database trigger)

-- ------------------------------------------------------------------------------
-- 4.2 FILES POLICIES
-- ------------------------------------------------------------------------------
-- Users can read only their own file metadata
CREATE POLICY "Users can read own files"
    ON public.files
    FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);

-- Users can insert file metadata only with their own owner_id
CREATE POLICY "Users can insert own files"
    ON public.files
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- Users can update only their own file metadata
CREATE POLICY "Users can update own files"
    ON public.files
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Users can delete only their own file metadata
CREATE POLICY "Users can delete own files"
    ON public.files
    FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 4.3 SHARE_LINKS POLICIES
-- ------------------------------------------------------------------------------
-- Users can view share links for files they own
CREATE POLICY "Users can read own share links"
    ON public.share_links
    FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);

-- Normal client-side users cannot INSERT share links directly.
-- Insertion is strictly performed by privileged Edge Functions (service_role).

-- Users can revoke their own share links (revoked_at must be provided and non-null)
CREATE POLICY "Users can revoke own share links"
    ON public.share_links
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id AND revoked_at IS NOT NULL);

-- Users can delete their own share links
CREATE POLICY "Users can delete own share links"
    ON public.share_links
    FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- Guest access: NO public/anon policies on share_links.
-- Guest access is mediated exclusively via Edge Functions.

-- ==============================================================================
-- 5. COLUMN-LEVEL PERMISSIONS (PRIVILEGE HARDENING)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 5.1 PROFILES PERMISSIONS
-- Authenticated users may only update full_name.
-- Direct updates to id, email, created_at, and updated_at are revoked.
-- ------------------------------------------------------------------------------
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

-- ------------------------------------------------------------------------------
-- 5.2 SHARE_LINKS PERMISSIONS
-- Authenticated users may only update revoked_at.
-- Direct updates to token_hash, file_id, owner_id, expires_at, id, or created_at are revoked.
-- ------------------------------------------------------------------------------
REVOKE UPDATE ON TABLE public.share_links FROM PUBLIC, anon, authenticated;
GRANT UPDATE (revoked_at) ON TABLE public.share_links TO authenticated;

-- ==============================================================================
-- 6. AUTOMATED TRIGGERS & FUNCTIONS (SECURITY HARDENED)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 6.1 Updated At Timestamp Maintenance
-- Sets safe empty search_path, uses pg_catalog.now(), runs with SECURITY DEFINER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Refreshes updated_at timestamp on row modification';

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_files_updated_at ON public.files;
CREATE TRIGGER set_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6.2 Profile Provisioning on User Registration
-- Sets safe empty search_path, fully qualifies all schema objects, runs with SECURITY DEFINER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NULL
        ),
        pg_catalog.now(),
        pg_catalog.now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically provisions a public.profiles row when a new user registers in auth.users';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
