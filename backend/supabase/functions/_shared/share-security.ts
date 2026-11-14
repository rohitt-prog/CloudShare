/**
 * Pure Cryptographic and Security Logic for Supabase Edge Functions
 * Shared between create-share-link, access-shared-file, and automated test runners.
 *
 * Designed to execute identically in:
 * 1. Supabase Edge Runtime (Deno)
 * 2. Node.js Native Test Runner (v20+)
 *
 * Contains ZERO external URL/JSR imports to guarantee dual-environment execution.
 */

export const SHARE_TOKEN_BYTE_LENGTH = 32;
export const SHARE_TOKEN_BASE64URL_LENGTH = 43;
export const SHARE_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Foreign key relationship name linking public.share_links to public.files.
 * Must match the composite foreign key constraint in 20261114191500_create_base_schema.sql.
 */
export const EXPECTED_SHARE_LINK_FK_NAME = 'fk_share_links_file_owner';

/**
 * PostgREST select query string utilized by access-shared-file.
 */
export const ACCESS_SHARED_FILE_SELECT_QUERY = `
  id,
  file_id,
  expires_at,
  revoked_at,
  files!fk_share_links_file_owner (
    id,
    file_name,
    file_size,
    mime_type,
    storage_path
  )
`.trim();

/**
 * Encodes a Uint8Array into unpadded Base64URL (RFC 4648 §5).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a high-entropy 256-bit token (32 random bytes) as a 43-character Base64URL string.
 */
export function generateCryptoShareToken(): string {
  const tokenBytes = new Uint8Array(SHARE_TOKEN_BYTE_LENGTH);
  crypto.getRandomValues(tokenBytes);
  return bytesToBase64Url(tokenBytes);
}

/**
 * Calculates a standard SHA-256 digest of the token string and returns 64 lowercase hex chars.
 */
export async function hashCryptoShareToken(rawToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken.trim()));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates that an input token string strictly adheres to 43-character Base64URL format.
 */
export function validateTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') {
    return false;
  }
  return SHARE_TOKEN_REGEX.test(token.trim());
}

/**
 * Validates that a string is a well-formed UUID.
 */
export function validateUUID(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id.trim());
}

/**
 * Validates expiration duration in hours.
 * Rejects values outside the range 1..720 (30 days) and non-numeric inputs.
 */
export function validateExpirationHours(hoursInput: unknown): {
  isValid: boolean;
  hours: number;
  error?: string;
} {
  const hours = Number(hoursInput ?? 24);
  if (isNaN(hours) || hours < 1 || hours > 720) {
    return {
      isValid: false,
      hours,
      error: 'expiresInHours must be a number between 1 and 720 (30 days)',
    };
  }
  return { isValid: true, hours };
}

/**
 * Validates whether a link has been revoked.
 */
export function isLinkRevoked(revokedAt: string | null | undefined): boolean {
  return revokedAt !== null && revokedAt !== undefined;
}

/**
 * Validates whether a link's expiration timestamp is in the past.
 */
export function isLinkExpired(
  expiresAt: string,
  nowMs = Date.now()
): boolean {
  const expiryMs = Date.parse(expiresAt);

  return !Number.isFinite(expiryMs) || expiryMs <= nowMs;
}

/**
 * Calculates a future ISO timestamp given expiration hours.
 */
export function calculateExpiresAt(hours: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + hours * 3600 * 1000).toISOString();
}
