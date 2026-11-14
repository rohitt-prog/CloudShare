import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { FileItem } from '@/features/files/types';
import {
  mapDatabaseFileToFileItem,
  formatByteSize,
  isMissingTableError,
  sanitizeDatabaseError,
} from '@/features/files/types';
import type { FileRow } from '@/types/database';

export interface FileListResult {
  files: FileItem[];
  error: string | null;
  isTableMissing?: boolean;
}

export interface FileDetailsResult {
  file: FileItem | null;
  error: string | null;
}

/**
 * Preview files shown only when the remote Supabase database migration has not been deployed yet,
 * or when Supabase client credentials are unconfigured.
 */
export const PREVIEW_DEMO_FILES: FileItem[] = [
  {
    id: 'demo-1',
    fileName: 'Project_Specification_v1.pdf',
    storagePath: 'demo/Project_Specification_v1.pdf',
    fileSize: 2450000,
    mimeType: 'application/pdf',
    ownerId: 'demo-user',
    createdAt: '2026-11-14T10:30:00.000Z',
    updatedAt: '2026-11-14T10:30:00.000Z',
    category: 'documents',
    formattedSize: formatByteSize(2450000),
  },
  {
    id: 'demo-2',
    fileName: 'System_Architecture_Diagram.png',
    storagePath: 'demo/System_Architecture_Diagram.png',
    fileSize: 4890000,
    mimeType: 'image/png',
    ownerId: 'demo-user',
    createdAt: '2026-11-13T14:15:00.000Z',
    updatedAt: '2026-11-13T14:15:00.000Z',
    category: 'images',
    formattedSize: formatByteSize(4890000),
  },
  {
    id: 'demo-3',
    fileName: 'Product_Demo_Recording.mp4',
    storagePath: 'demo/Product_Demo_Recording.mp4',
    fileSize: 18450000,
    mimeType: 'video/mp4',
    ownerId: 'demo-user',
    createdAt: '2026-11-12T09:00:00.000Z',
    updatedAt: '2026-11-12T09:00:00.000Z',
    category: 'media',
    formattedSize: formatByteSize(18450000),
  },
  {
    id: 'demo-4',
    fileName: 'Client_Assets_Archive.zip',
    storagePath: 'demo/Client_Assets_Archive.zip',
    fileSize: 12200000,
    mimeType: 'application/zip',
    ownerId: 'demo-user',
    createdAt: '2026-11-11T18:45:00.000Z',
    updatedAt: '2026-11-11T18:45:00.000Z',
    category: 'archives',
    formattedSize: formatByteSize(12200000),
  },
  {
    id: 'demo-5',
    fileName: 'Financial_Projections_2027.xlsx',
    storagePath: 'demo/Financial_Projections_2027.xlsx',
    fileSize: 850000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ownerId: 'demo-user',
    createdAt: '2026-11-10T11:20:00.000Z',
    updatedAt: '2026-11-10T11:20:00.000Z',
    category: 'documents',
    formattedSize: formatByteSize(850000),
  },
];

/**
 * Validates authenticated user session inside the service boundary.
 * Never trusts unauthenticated or arbitrary caller-supplied owner IDs.
 */
async function resolveAuthenticatedUser(expectedOwnerId?: string): Promise<{
  userId: string | null;
  error: string | null;
}> {
  // If Supabase credentials are not configured, allow local preview mode
  if (!isSupabaseConfigured) {
    return { userId: expectedOwnerId || 'demo-user', error: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return {
        userId: null,
        error: 'Authentication required. Please sign in to view your files.',
      };
    }

    const authenticatedId = data.user.id;

    // Reject arbitrary or mismatched owner IDs supplied by callers
    if (expectedOwnerId && expectedOwnerId !== authenticatedId) {
      return {
        userId: null,
        error: 'Access denied: You cannot view files belonging to another user account.',
      };
    }

    return { userId: authenticatedId, error: null };
  } catch {
    return {
      userId: null,
      error: 'Authentication failed: Unable to verify user session. Please sign in again.',
    };
  }
}

/**
 * File Metadata Service
 * Enforces authenticated identity verification and strictly scopes queries to the authenticated user.
 * Note: Client-side filtering is an extra query filter; PostgreSQL Row Level Security (RLS)
 * remains the true security boundary enforcing access control once migrations are deployed.
 */
export const fileService = {
  /**
   * Retrieves all file metadata records owned by the authenticated user.
   * If caller passes ownerId, it is validated against the authenticated user and rejected on mismatch.
   */
  async listFiles(ownerId?: string): Promise<FileListResult> {
    // 1. If Supabase is unconfigured, return demo files
    if (!isSupabaseConfigured) {
      return {
        files: PREVIEW_DEMO_FILES,
        error: null,
        isTableMissing: true,
      };
    }

    // 2. Validate authenticated user at the service boundary
    const auth = await resolveAuthenticatedUser(ownerId);
    if (auth.error || !auth.userId) {
      return {
        files: [],
        error: auth.error || 'User is not authenticated.',
      };
    }

    const authenticatedUserId = auth.userId;

    // 3. Query files using genuine authenticated user ID
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('owner_id', authenticatedUserId)
        .order('created_at', { ascending: false });

      if (error) {
        // Only fall back to demo mode if the table is confirmed missing from the database
        if (isMissingTableError(error)) {
          return {
            files: PREVIEW_DEMO_FILES,
            error: null,
            isTableMissing: true,
          };
        }

        // Real permission, authentication, or database errors are sanitized and reported
        return {
          files: [],
          error: sanitizeDatabaseError(error),
        };
      }

      const files = ((data as FileRow[]) || []).map(mapDatabaseFileToFileItem);
      return { files, error: null, isTableMissing: false };
    } catch {
      // Network failures, CORS rejections, or client errors are NEVER converted to demo mode
      return {
        files: [],
        error: 'Network connection failure. Please check your internet connection and try again.',
      };
    }
  },

  /**
   * Retrieves an individual file's metadata record owned by the authenticated user.
   * Validates authenticated identity and never replaces real database errors with demo records.
   */
  async getFileById(fileId: string, ownerId?: string): Promise<FileDetailsResult> {
    if (!fileId) {
      return { file: null, error: 'File ID is required.' };
    }

    // 1. If Supabase is unconfigured, demo mode is genuinely active
    if (!isSupabaseConfigured) {
      const demoFile = PREVIEW_DEMO_FILES.find((f) => f.id === fileId) || null;
      return {
        file: demoFile,
        error: demoFile ? null : 'File not found in demo vault.',
      };
    }

    // 2. Validate authenticated user at the service boundary
    const auth = await resolveAuthenticatedUser(ownerId);
    if (auth.error || !auth.userId) {
      return {
        file: null,
        error: auth.error || 'User is not authenticated.',
      };
    }

    const authenticatedUserId = auth.userId;

    // 3. Query file metadata scoped to authenticated user ID
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('owner_id', authenticatedUserId)
        .single();

      if (error) {
        // Only return demo data if the table is confirmed missing from the database
        if (isMissingTableError(error)) {
          const demoFile = PREVIEW_DEMO_FILES.find((f) => f.id === fileId) || null;
          return {
            file: demoFile,
            error: demoFile ? null : 'File not found in demo vault.',
          };
        }

        // Real database errors (including 404, 403, 500) must NEVER be replaced with demo records
        return {
          file: null,
          error: sanitizeDatabaseError(error),
        };
      }

      return { file: mapDatabaseFileToFileItem(data as FileRow), error: null };
    } catch {
      // Runtime or network errors must be surfaced accurately with safe sanitized messages
      return {
        file: null,
        error: 'Network connection failure. Please check your internet connection and try again.',
      };
    }
  },
};
