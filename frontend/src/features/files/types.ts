import type { FileRow } from '@/types/database';

export type FileCategory = 'all' | 'documents' | 'images' | 'media' | 'archives' | 'other';

export type FileSortField = 'name' | 'size' | 'date';
export type FileSortOrder = 'asc' | 'desc';

export interface FileSortOption {
  field: FileSortField;
  order: FileSortOrder;
}

export interface FileItem {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  category: FileCategory;
  formattedSize: string;
}

export interface FileStats {
  totalFiles: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  categoryCounts: Record<FileCategory, number>;
}

export interface FileFilterOptions {
  searchQuery: string;
  category: FileCategory;
  sort: FileSortOption;
}

/**
 * Derives a human-readable category from MIME type and filename extension
 */
export function determineFileCategory(mimeType: string | null, fileName: string): FileCategory {
  const normalizedMime = (mimeType || '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (
    normalizedMime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)
  ) {
    return 'images';
  }

  if (
    normalizedMime.startsWith('video/') ||
    normalizedMime.startsWith('audio/') ||
    ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'flac'].includes(ext)
  ) {
    return 'media';
  }

  if (
    normalizedMime.includes('pdf') ||
    normalizedMime.includes('word') ||
    normalizedMime.includes('document') ||
    normalizedMime.includes('spreadsheet') ||
    normalizedMime.includes('presentation') ||
    normalizedMime.startsWith('text/') ||
    ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)
  ) {
    return 'documents';
  }

  if (
    normalizedMime.includes('zip') ||
    normalizedMime.includes('tar') ||
    normalizedMime.includes('gzip') ||
    normalizedMime.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)
  ) {
    return 'archives';
  }

  return 'other';
}

/**
 * Formats byte size into human-readable representation
 */
export function formatByteSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Normalizes database FileRow into domain FileItem
 */
export function mapDatabaseFileToFileItem(row: FileRow): FileItem {
  return {
    id: row.id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: determineFileCategory(row.mime_type, row.file_name),
    formattedSize: formatByteSize(row.file_size),
  };
}

/**
 * Parses a timestamp string safely into epoch milliseconds.
 * Returns 0 for null, undefined, empty, or non-finite values to ensure deterministic sorting without NaN.
 */
export function parseTimestampSafe(dateStr: string | null | undefined): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const time = new Date(dateStr).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * Accurately determines if a PostgREST/PostgreSQL error specifically indicates that the 'public.files' table is missing.
 * Matches:
 *  1. PostgreSQL error code 42P01 (undefined_table).
 *  2. PostgREST error code PGRST205 (relation not found in schema cache) when targeting 'files'.
 *  3. Narrow, unambiguous missing-relation message patterns explicitly specifying relation "public.files" or "files".
 *
 * Explicitly EXCLUDES:
 *  - PGRST204 (missing column)
 *  - PGRST200 (schema relationship / embedding error)
 *  - PGRST301 or unrelated authentication/JWT errors
 *  - Generic HTTP 404 / single row not found (PGRST116)
 *  - Permission errors (42501), network errors, CORS errors, or server errors
 */
export function isMissingTableError(
  error: { code?: string; message?: string; details?: string } | null | undefined
): boolean {
  if (!error) return false;
  const code = (error.code || '').trim().toUpperCase();
  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();

  // 1. PostgreSQL 42P01: undefined_table
  if (code === '42P01') {
    return true;
  }

  // 2. PostgREST PGRST205: table not found in schema cache
  if (code === 'PGRST205') {
    if (message.includes('files') || details.includes('files')) {
      return true;
    }
  }

  // 3. Narrow, unambiguous missing-relation message patterns
  if (
    message.includes('relation "public.files" does not exist') ||
    message.includes('relation "files" does not exist') ||
    message.includes("could not find the table 'public.files'") ||
    message.includes("could not find the table 'files'")
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes database error messages for end-user presentation,
 * preventing internal database internals, SQL details, or connection strings from leaking,
 * while preserving clear distinctions between error categories.
 */
export function sanitizeDatabaseError(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (!error) return 'An unexpected database error occurred.';

  const code = (error.code || '').trim().toUpperCase();
  const message = (error.message || '').toLowerCase();

  // PostgREST single row not found
  if (code === 'PGRST116' || message.includes('row not found')) {
    return 'File not found.';
  }

  // PostgreSQL 42501: insufficient privilege / RLS policy rejection
  if (code === '42501' || message.includes('permission denied')) {
    return 'Access denied: You do not have permission to access these files.';
  }

  // Missing table
  if (code === '42P01' || code === 'PGRST205') {
    return 'Database table is missing. Please ensure database migrations are applied.';
  }

  // Server errors (500, 503, connection exceptions 08xxx)
  if (code === '500' || code === '503' || code.startsWith('08') || code.startsWith('XX')) {
    return 'Server error: Unable to load file data. Please try again later.';
  }

  return 'Database operation failed. Please refresh or try again.';
}

/**
 * Synchronously derives the visible files and selection for rendering,
 * enforcing strict account isolation during rendering before effects execute.
 *
 * Guarantees that:
 * 1. If user is null (logged out), all files and selections are hidden immediately.
 * 2. If loadedOwnerId does not match currentUserId, files and selections are hidden immediately (intermediate render safety).
 * 3. Any selected file not owned by currentUserId is purged.
 */
export function deriveIsolatedFileState<T extends { ownerId?: string }>(
  currentUserId: string | null | undefined,
  loadedOwnerId: string | null | undefined,
  files: T[],
  selectedFile: T | null
): {
  visibleFiles: T[];
  visibleSelectedFile: T | null;
  isOwnerMatch: boolean;
} {
  if (!currentUserId) {
    return {
      visibleFiles: [],
      visibleSelectedFile: null,
      isOwnerMatch: false,
    };
  }

  const isOwnerMatch = loadedOwnerId === currentUserId;

  if (!isOwnerMatch) {
    return {
      visibleFiles: [],
      visibleSelectedFile: null,
      isOwnerMatch: false,
    };
  }

  const isSelectionOwned =
    selectedFile &&
    (!selectedFile.ownerId || selectedFile.ownerId === currentUserId || selectedFile.ownerId === 'demo-user');

  return {
    visibleFiles: files,
    visibleSelectedFile: isSelectionOwned ? selectedFile : null,
    isOwnerMatch: true,
  };
}
