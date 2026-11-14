/**
 * File Sharing Service
 *
 * Implements client-side interaction with Supabase Edge Functions
 * (create-share-link, access-shared-file) and database share_links table.
 *
 * Enforces strict security boundaries:
 * - Rejects operations when Supabase is unconfigured (no fake sharing simulation).
 * - Validates cryptographic token formats before dispatching requests.
 * - Protects against privilege leakage: service_role key is NEVER used on frontend.
 * - Ensures owner-scoped queries and updates with RLS.
 */

import { supabase as defaultSupabase, isSupabaseConfigured as defaultIsConfigured } from '../../../lib/supabase.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/database.ts';
import {
  isValidTokenFormat,
  isValidUUID,
  deriveLinkStatus,
} from '../utils/sharing-crypto.ts';
import {
  buildShareUrl,
  formatSharedMetadata,
  type CreateShareLinkParams,
  type CreateShareLinkResult,
  type ShareLinksListResult,
  type RevokeShareLinkResult,
  type SharedFileMetadataResult,
  type SharedFileDownloadResult,
  type ShareLinkItem,
} from '../types.ts';

export interface ShareService {
  createShareLink: (params: CreateShareLinkParams) => Promise<CreateShareLinkResult>;
  listFileShareLinks: (fileId: string) => Promise<ShareLinksListResult>;
  revokeShareLink: (linkId: string) => Promise<RevokeShareLinkResult>;
  getSharedFileMetadata: (token: string) => Promise<SharedFileMetadataResult>;
  getSharedFileDownloadUrl: (token: string) => Promise<SharedFileDownloadResult>;
}

export function createShareService(
  client: SupabaseClient<Database> = defaultSupabase,
  isConfigured: boolean = defaultIsConfigured
): ShareService {
  return {
    /**
     * Calls create-share-link Edge Function to securely generate a sharing link.
     */
    async createShareLink(params: CreateShareLinkParams): Promise<CreateShareLinkResult> {
      if (!isConfigured) {
        return {
          success: false,
          error: 'Supabase credentials are unconfigured. Secure file sharing requires active Supabase services.',
        };
      }

      if (!params.fileId || !isValidUUID(params.fileId)) {
        return {
          success: false,
          error: 'Invalid file ID specified.',
        };
      }

      const expiresInHours = params.expiresInHours ?? 24;
      if (expiresInHours < 1 || expiresInHours > 720) {
        return {
          success: false,
          error: 'Expiration must be between 1 hour and 720 hours (30 days).',
        };
      }

      try {
        const { data, error } = await client.functions.invoke('create-share-link', {
          body: {
            fileId: params.fileId,
            expiresInHours,
          },
        });

        if (error) {
          const errorMessage =
            (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string')
              ? error.message
              : 'Failed to create share link.';
          return { success: false, error: errorMessage };
        }

        if (!data || !data.token || !data.shareId) {
          return {
            success: false,
            error: 'Edge function returned invalid share link data.',
          };
        }

        return {
          success: true,
          shareId: data.shareId,
          rawToken: data.token,
          shareUrl: buildShareUrl(data.token),
          expiresAt: data.expiresAt,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected network error during share link creation.';
        return { success: false, error: message };
      }
    },

    /**
     * Lists existing share links for a specific file owned by the authenticated caller.
     */
    async listFileShareLinks(fileId: string): Promise<ShareLinksListResult> {
      if (!isConfigured) {
        return {
          success: false,
          error: 'Supabase credentials are unconfigured.',
        };
      }

      if (!fileId || !isValidUUID(fileId)) {
        return {
          success: false,
          error: 'Invalid file ID specified.',
        };
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) {
          return {
            success: false,
            error: 'Authentication required to inspect share links.',
          };
        }

        const { data, error } = await client
          .from('share_links')
          .select('id, file_id, owner_id, expires_at, revoked_at, created_at')
          .eq('file_id', fileId)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          return {
            success: false,
            error: error.message || 'Failed to retrieve share links.',
          };
        }

        const links: ShareLinkItem[] = (data || []).map((row) => ({
          id: row.id,
          fileId: row.file_id,
          ownerId: row.owner_id,
          expiresAt: row.expires_at,
          revokedAt: row.revoked_at,
          createdAt: row.created_at,
          status: deriveLinkStatus({
            expires_at: row.expires_at,
            revoked_at: row.revoked_at,
          }),
        }));

        return { success: true, links };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error listing share links.';
        return { success: false, error: message };
      }
    },

    /**
     * Revokes an existing active share link owned by the caller.
     */
    async revokeShareLink(linkId: string): Promise<RevokeShareLinkResult> {
      if (!isConfigured) {
        return {
          success: false,
          error: 'Supabase credentials are unconfigured.',
        };
      }

      if (!linkId || !isValidUUID(linkId)) {
        return {
          success: false,
          error: 'Invalid share link ID specified.',
        };
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) {
          return {
            success: false,
            error: 'Authentication required to revoke share links.',
          };
        }

        const now = new Date().toISOString();
        const { error } = await client
          .from('share_links')
          .update({ revoked_at: now })
          .eq('id', linkId)
          .eq('owner_id', user.id);

        if (error) {
          return {
            success: false,
            error: error.message || 'Failed to revoke share link.',
          };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error revoking share link.';
        return { success: false, error: message };
      }
    },

    /**
     * Resolves metadata for a shared file as an unauthenticated guest.
     */
    async getSharedFileMetadata(token: string): Promise<SharedFileMetadataResult> {
      if (!isConfigured) {
        return {
          success: false,
          error: 'Supabase credentials are unconfigured. Cannot verify shared file.',
        };
      }

      if (!isValidTokenFormat(token)) {
        return {
          success: false,
          error: 'Invalid or expired share link.',
        };
      }

      try {
        const { data, error } = await client.functions.invoke('access-shared-file', {
          body: {
            shareToken: token.trim(),
            action: 'metadata',
          },
        });

        if (error || !data || !data.fileName) {
          return {
            success: false,
            error: 'Shared file not found or link has expired.',
          };
        }

        return {
          success: true,
          metadata: formatSharedMetadata(data),
        };
      } catch {
        return {
          success: false,
          error: 'Shared file not found or link has expired.',
        };
      }
    },

    /**
     * Obtains a short-lived signed download URL for a shared file as a guest.
     */
    async getSharedFileDownloadUrl(token: string): Promise<SharedFileDownloadResult> {
      if (!isConfigured) {
        return {
          success: false,
          error: 'Supabase credentials are unconfigured. Cannot download shared file.',
        };
      }

      if (!isValidTokenFormat(token)) {
        return {
          success: false,
          error: 'Invalid or expired share link.',
        };
      }

      try {
        const { data, error } = await client.functions.invoke('access-shared-file', {
          body: {
            shareToken: token.trim(),
            action: 'download',
          },
        });

        if (error || !data || !data.downloadUrl) {
          return {
            success: false,
            error: 'Failed to obtain download URL. The link may have expired.',
          };
        }

        return {
          success: true,
          downloadUrl: data.downloadUrl,
          expiresInSeconds: data.expiresInSeconds ?? 60,
          fileName: data.fileName,
        };
      } catch {
        return {
          success: false,
          error: 'Failed to obtain download URL. The link may have expired.',
        };
      }
    },
  };
}

export const shareService = createShareService();
