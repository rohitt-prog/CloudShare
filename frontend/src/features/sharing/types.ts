/**
 * Sharing Feature Domain Types
 * Strict typing for Phase 6 Secure File Sharing & Permissions
 */

import { formatByteSize } from '../files/types.ts';

export type FileAccessLevel = 'view' | 'download';
export type ShareLinkStatus = 'active' | 'expired' | 'revoked';

export interface ExpirationOption {
  label: string;
  hours: number;
  description: string;
}

export const EXPIRATION_OPTIONS: readonly ExpirationOption[] = [
  { label: '1 Hour', hours: 1, description: 'Short-lived temporary access' },
  { label: '24 Hours', hours: 24, description: 'Standard 1-day access' },
  { label: '7 Days', hours: 168, description: 'Extended 1-week access' },
] as const;

export interface ShareLinkItem {
  id: string;
  fileId: string;
  ownerId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  status: ShareLinkStatus;
}

export interface CreateShareLinkParams {
  fileId: string;
  expiresInHours?: number;
}

export interface CreateShareLinkSuccess {
  success: true;
  shareId: string;
  rawToken: string;
  shareUrl: string;
  expiresAt: string;
}

export interface CreateShareLinkFailure {
  success: false;
  error: string;
}

export type CreateShareLinkResult = CreateShareLinkSuccess | CreateShareLinkFailure;

export interface ShareLinksListSuccess {
  success: true;
  links: ShareLinkItem[];
}

export interface ShareLinksListFailure {
  success: false;
  error: string;
}

export type ShareLinksListResult = ShareLinksListSuccess | ShareLinksListFailure;

export interface RevokeShareLinkSuccess {
  success: true;
}

export interface RevokeShareLinkFailure {
  success: false;
  error: string;
}

export type RevokeShareLinkResult = RevokeShareLinkSuccess | RevokeShareLinkFailure;

export interface SharedFileMetadata {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  mimeType: string;
  expiresAt: string;
}

export interface SharedFileMetadataSuccess {
  success: true;
  metadata: SharedFileMetadata;
}

export interface SharedFileMetadataFailure {
  success: false;
  error: string;
}

export type SharedFileMetadataResult = SharedFileMetadataSuccess | SharedFileMetadataFailure;

export interface SharedFileDownloadSuccess {
  success: true;
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
}

export interface SharedFileDownloadFailure {
  success: false;
  error: string;
}

export type SharedFileDownloadResult = SharedFileDownloadSuccess | SharedFileDownloadFailure;

/**
 * Builds public guest URL format: https://<domain>/?share=<token>
 */
export function buildShareUrl(token: string, origin?: string): string {
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://cloudshare.local');
  return `${baseOrigin}/?share=${encodeURIComponent(token)}`;
}

/**
 * Helper to construct formatted SharedFileMetadata from API response
 */
export function formatSharedMetadata(raw: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: string;
}): SharedFileMetadata {
  return {
    fileName: raw.fileName,
    fileSize: raw.fileSize,
    formattedSize: formatByteSize(raw.fileSize),
    mimeType: raw.mimeType || 'application/octet-stream',
    expiresAt: raw.expiresAt,
  };
}
