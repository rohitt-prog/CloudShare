/**
 * Supabase Edge Function: create-share-link
 * Architectural boundary for generating cryptographically secure file sharing links.
 *
 * Responsibility:
 * 1. Authenticate caller (must be the authenticated owner of the file).
 * 2. Validate input parameters (expiration time, access permissions, max downloads).
 * 3. Generate high-entropy sharing token.
 * 4. Store share link record in `share_links` table with cryptographic hash if password protected.
 * 5. Return the secure public share URL/token to the frontend.
 *
 * NOTE: Concrete runtime logic reserved for Phase 6 (Sharing & Permissions).
 */

export interface CreateShareLinkRequest {
  fileId: string;
  accessLevel: 'view' | 'download';
  expiresInHours?: number | null;
  maxDownloads?: number | null;
}

export interface CreateShareLinkResponse {
  shareId: string;
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export const functionConfig = {
  name: 'create-share-link',
  runtime: 'edge-runtime',
  version: '1.0.0',
  phase: 'Phase 2A Architecture Definition',
};
