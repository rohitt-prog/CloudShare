import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, FileRow } from '../../../types/database.ts';
import { supabase as defaultSupabase, isSupabaseConfigured as defaultIsSupabaseConfigured } from '../../../lib/supabase.ts';
import { STORAGE_BUCKETS } from '../../../constants/index.ts';
import type {
  FileItem,
  FileUploadResult,
  FileDownloadResult,
  FileOperationResult,
} from '../types.ts';
import {
  mapDatabaseFileToFileItem,
  formatByteSize,
  determineFileCategory,
  isMissingTableError,
  sanitizeDatabaseError,
  sanitizeStorageError,
  validateFileForUpload,
  generateStoragePath,
} from '../types.ts';

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
async function resolveAuthenticatedUser(
  client: SupabaseClient<Database>,
  isConfigured: boolean,
  expectedOwnerId?: string
): Promise<{
  userId: string | null;
  error: string | null;
}> {
  // If Supabase credentials are not configured, allow local preview mode
  if (!isConfigured) {
    return { userId: expectedOwnerId || 'demo-user', error: null };
  }

  try {
    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      return {
        userId: null,
        error: 'Authentication required. Please sign in to perform this operation.',
      };
    }

    const authenticatedId = data.user.id;

    // Reject arbitrary or mismatched owner IDs supplied by callers
    if (expectedOwnerId && expectedOwnerId !== authenticatedId) {
      return {
        userId: null,
        error: 'Access denied: You cannot access resources belonging to another user account.',
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
 * Triggers a browser download for a retrieved file Blob.
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Factory for creating a File Metadata & Storage Service.
 * Allows injecting a client for unit testing while defaulting to the singleton Supabase client.
 */
export function createFileService(
  client: SupabaseClient<Database> = defaultSupabase,
  isConfigured: boolean = defaultIsSupabaseConfigured
) {
  return {
    /**
     * Uploads a file to Supabase Storage and records its metadata in public.files.
     * Handles compensation cleanup if database insertion fails after storage upload.
     */
    async uploadFile(file: File, ownerId?: string): Promise<FileUploadResult> {
      // 1. Client-side file validation
      const validation = validateFileForUpload(file);
      if (!validation.isValid) {
        return { file: null, error: validation.error };
      }

      // 2. Validate authenticated user at the service boundary
      const auth = await resolveAuthenticatedUser(client, isConfigured, ownerId);
      if (auth.error || !auth.userId) {
        return { file: null, error: auth.error || 'Authentication required to upload files.' };
      }

      const authenticatedUserId = auth.userId;

      // 3. If Supabase is unconfigured, register in preview vault
      if (!isConfigured) {
        const demoId = `demo-${Date.now()}`;
        const newDemoFile: FileItem = {
          id: demoId,
          fileName: file.name,
          storagePath: `demo/${file.name}`,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          ownerId: authenticatedUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: determineFileCategory(file.type || null, file.name),
          formattedSize: formatByteSize(file.size),
        };
        PREVIEW_DEMO_FILES.unshift(newDemoFile);
        return { file: newDemoFile, error: null };
      }

      // 4. Generate collision-resistant unique file identifier and isolated path
      const fileId = crypto.randomUUID();
      const storagePath = generateStoragePath(authenticatedUserId, fileId, file.name);

      // 5. Upload object to Supabase Storage private bucket
      try {
        const { error: uploadError } = await client.storage
          .from(STORAGE_BUCKETS.FILES)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) {
          return { file: null, error: sanitizeStorageError(uploadError) };
        }

        // 6. Persist metadata record in public.files table
        const { data: dbData, error: dbError } = await client
          .from('files')
          .insert({
            id: fileId,
            owner_id: authenticatedUserId,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
          })
          .select()
          .single();

        if (dbError) {
          // COMPENSATION: Storage upload succeeded but database insertion failed.
          // Clean up the orphaned storage object to maintain consistency.
          try {
            const { error: cleanupError } = await client.storage
              .from(STORAGE_BUCKETS.FILES)
              .remove([storagePath]);

            if (cleanupError) {
              console.warn(
                '[CloudShare] Cleanup of orphaned storage object failed:',
                sanitizeStorageError(cleanupError)
              );
            }
          } catch (cleanupErr) {
            console.warn('[CloudShare] Cleanup of orphaned storage object encountered exception:', cleanupErr);
          }
          return { file: null, error: sanitizeDatabaseError(dbError) };
        }

        return {
          file: mapDatabaseFileToFileItem(dbData as FileRow),
          error: null,
        };
      } catch {
        return {
          file: null,
          error: 'Network connection failure during upload. Please check your internet connection.',
        };
      }
    },

    /**
     * Retrieves all file metadata records owned by the authenticated user.
     * If caller passes ownerId, it is validated against the authenticated user and rejected on mismatch.
     */
    async listFiles(ownerId?: string): Promise<FileListResult> {
      // 1. If Supabase is unconfigured, return demo files
      if (!isConfigured) {
        return {
          files: PREVIEW_DEMO_FILES,
          error: null,
          isTableMissing: true,
        };
      }

      // 2. Validate authenticated user at the service boundary
      const auth = await resolveAuthenticatedUser(client, isConfigured, ownerId);
      if (auth.error || !auth.userId) {
        return {
          files: [],
          error: auth.error || 'User is not authenticated.',
        };
      }

      const authenticatedUserId = auth.userId;

      // 3. Query files using genuine authenticated user ID
      try {
        const { data, error } = await client
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
      if (!isConfigured) {
        const demoFile = PREVIEW_DEMO_FILES.find((f) => f.id === fileId) || null;
        return {
          file: demoFile,
          error: demoFile ? null : 'File not found in demo vault.',
        };
      }

      // 2. Validate authenticated user at the service boundary
      const auth = await resolveAuthenticatedUser(client, isConfigured, ownerId);
      if (auth.error || !auth.userId) {
        return {
          file: null,
          error: auth.error || 'User is not authenticated.',
        };
      }

      const authenticatedUserId = auth.userId;

      // 3. Query file metadata scoped to authenticated user ID
      try {
        const { data, error } = await client
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

    /**
     * Downloads a private file directly from Supabase Storage for the authenticated owner.
     * Never generates or exposes public URLs for private files.
     */
    async downloadFile(file: FileItem, ownerId?: string): Promise<FileDownloadResult> {
      if (!file || !file.storagePath) {
        return { blob: null, error: 'File information is missing.' };
      }

      // 1. Validate authenticated user at the service boundary
      const auth = await resolveAuthenticatedUser(client, isConfigured, ownerId);
      if (auth.error || !auth.userId) {
        return { blob: null, error: auth.error || 'Authentication required to download files.' };
      }

      const authenticatedUserId = auth.userId;

      // Reject cross-user download attempts based on ownerId
      if (file.ownerId !== authenticatedUserId && file.ownerId !== 'demo-user') {
        return { blob: null, error: 'Access denied: You do not have permission to download this file.' };
      }

      // Defense-in-depth: Verify storagePath starts with exact prefix `${authenticatedUserId}/`
      if (authenticatedUserId !== 'demo-user') {
        const expectedPrefix = `${authenticatedUserId}/`;
        if (!file.storagePath || !file.storagePath.startsWith(expectedPrefix)) {
          return {
            blob: null,
            error: 'Access denied: You do not have permission to download this file.',
          };
        }
      }

      // 2. If Supabase is unconfigured, generate local preview blob
      if (!isConfigured) {
        const demoContent = `CloudShare Preview File Content\nFilename: ${file.fileName}\nSize: ${file.formattedSize}\nCategory: ${file.category}\nOwner: ${file.ownerId}\nStorage: ${file.storagePath}\n`;
        const blob = new Blob([demoContent], { type: file.mimeType || 'text/plain' });
        return { blob, error: null };
      }

      // 3. Download object from Supabase Storage private bucket
      try {
        const { data, error: downloadError } = await client.storage
          .from(STORAGE_BUCKETS.FILES)
          .download(file.storagePath);

        if (downloadError) {
          return { blob: null, error: sanitizeStorageError(downloadError) };
        }

        if (!data) {
          return { blob: null, error: 'File content could not be retrieved from storage.' };
        }

        return { blob: data, error: null };
      } catch {
        return {
          blob: null,
          error: 'Network connection failure during download. Please check your internet connection.',
        };
      }
    },

    /**
     * Deletes a file's metadata record from the database and removes its object from storage.
     * Reports partial success if metadata is deleted but storage object deletion cannot be confirmed.
     */
    async deleteFile(file: FileItem, ownerId?: string): Promise<FileOperationResult> {
      if (!file || !file.id || !file.storagePath) {
        return { success: false, isPartial: false, warning: null, error: 'File information is missing.' };
      }

      // 1. Validate authenticated user at the service boundary
      const auth = await resolveAuthenticatedUser(client, isConfigured, ownerId);
      if (auth.error || !auth.userId) {
        return {
          success: false,
          isPartial: false,
          warning: null,
          error: auth.error || 'Authentication required to delete files.',
        };
      }

      const authenticatedUserId = auth.userId;

      // Reject cross-user deletion attempts
      if (file.ownerId !== authenticatedUserId && file.ownerId !== 'demo-user') {
        return {
          success: false,
          isPartial: false,
          warning: null,
          error: 'Access denied: You do not have permission to delete this file.',
        };
      }

      // Defense-in-depth: Verify storagePath starts with exact prefix `${authenticatedUserId}/`
      if (authenticatedUserId !== 'demo-user') {
        const expectedPrefix = `${authenticatedUserId}/`;
        if (!file.storagePath || !file.storagePath.startsWith(expectedPrefix)) {
          return {
            success: false,
            isPartial: false,
            warning: null,
            error: 'Access denied: You do not have permission to delete this file.',
          };
        }
      }

      // 2. If Supabase is unconfigured, remove from preview array
      if (!isConfigured) {
        const idx = PREVIEW_DEMO_FILES.findIndex((f) => f.id === file.id);
        if (idx !== -1) {
          PREVIEW_DEMO_FILES.splice(idx, 1);
        }
        return { success: true, isPartial: false, warning: null, error: null };
      }

      // 3. Delete metadata record from database first
      try {
        const { error: dbDeleteError } = await client
          .from('files')
          .delete()
          .eq('id', file.id)
          .eq('owner_id', authenticatedUserId);

        if (dbDeleteError) {
          return {
            success: false,
            isPartial: false,
            warning: null,
            error: sanitizeDatabaseError(dbDeleteError),
          };
        }

        // 4. Delete object from Supabase Storage private bucket
        try {
          const { error: storageDeleteError } = await client.storage
            .from(STORAGE_BUCKETS.FILES)
            .remove([file.storagePath]);

          if (storageDeleteError) {
            console.warn(
              '[CloudShare] Storage cleanup failed for deleted file:',
              sanitizeStorageError(storageDeleteError)
            );
            return {
              success: true,
              isPartial: true,
              warning: 'File metadata was removed from your vault, but storage object deletion could not be confirmed.',
              error: null,
            };
          }
        } catch (storageErr) {
          console.warn('[CloudShare] Storage removal network exception:', storageErr);
          return {
            success: true,
            isPartial: true,
            warning: 'File metadata was removed from your vault, but storage object deletion could not be confirmed due to a network error.',
            error: null,
          };
        }

        return { success: true, isPartial: false, warning: null, error: null };
      } catch {
        return {
          success: false,
          isPartial: false,
          warning: null,
          error: 'Network connection failure during deletion. Please check your internet connection.',
        };
      }
    },
  };
}

/**
 * Singleton production file service instance
 */
export const fileService = createFileService();
