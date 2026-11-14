/**
 * Application Constants
 */

export const APP_NAME = 'CloudShare';
export const APP_REPO_NAME = 'CloudVault';
export const APP_VERSION = '0.1.0';
export const CURRENT_PHASE = 'Phase 4: File Management Foundation';

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ),
};

export const STORAGE_BUCKETS = {
  FILES: 'user-files',
} as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB default limit
  DEFAULT_PAGE_SIZE: 20,
} as const;
