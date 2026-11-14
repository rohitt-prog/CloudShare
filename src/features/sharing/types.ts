/**
 * Sharing Feature Domain Types
 */

export type FileAccessLevel = 'view' | 'download';

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  accessLevel: FileAccessLevel;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  isPasswordProtected: boolean;
  createdAt: string;
}

export interface CreateShareLinkPayload {
  fileId: string;
  accessLevel: FileAccessLevel;
  expiresInHours?: number | null;
  password?: string | null;
  maxDownloads?: number | null;
}

export interface SharedFileAccessInfo {
  shareToken: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  accessLevel: FileAccessLevel;
  expiresAt: string | null;
  isExpired: boolean;
  requiresPassword: boolean;
}
