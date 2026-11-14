/**
 * Supabase Edge Function: access-shared-file
 * Architectural boundary for mediating public/guest access to shared files.
 *
 * Responsibility:
 * 1. Validate public share token without exposing the file's raw storage path.
 * 2. Verify token validity (expiration timestamp, download quota limits).
 * 3. Verify password hash if the share link is password-protected.
 * 4. Increment download count atomically in the database.
 * 5. Issue a short-lived (e.g. 60-second) signed storage download URL or stream content.
 *
 * NOTE: Concrete runtime logic reserved for Phase 6 (Sharing & Permissions).
 */

export interface AccessSharedFileRequest {
  shareToken: string;
  password?: string;
  action: 'metadata' | 'download';
}

export interface AccessSharedFileResponse {
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl?: string;
  expiresInSeconds?: number;
}

export const functionConfig = {
  name: 'access-shared-file',
  runtime: 'edge-runtime',
  version: '1.0.0',
  phase: 'Phase 2A Architecture Definition',
};
