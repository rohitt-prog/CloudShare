/**
 * Cryptographic and Validation Utilities for File Sharing
 *
 * Implements high-entropy token generation (32 bytes / 256 bits of entropy),
 * Base64URL encoding (RFC 4648 §5, unpadded 43-character output),
 * SHA-256 cryptographic hashing via standard Web Crypto API,
 * and deterministic token format and expiration validators.
 *
 * Designed to execute identically in Supabase Edge Functions (Deno),
 * Frontend browser runtime, and Node.js testing environments.
 */

export const SHARE_TOKEN_BYTE_LENGTH = 32;
export const SHARE_TOKEN_BASE64URL_LENGTH = 43;
export const SHARE_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Encodes a Uint8Array to an unpadded Base64URL string (RFC 4648 §5)
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
 * Generates a cryptographically secure 256-bit random sharing token.
 * Output is exactly 43 characters, matching /^[A-Za-z0-9_-]{43}$/.
 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(SHARE_TOKEN_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/**
 * Computes a SHA-256 cryptographic hash of the input string using Web Crypto API.
 * Returns a 64-character lowercase hexadecimal string.
 * This hash is safe to store in the database (never store plaintext tokens).
 */
export async function hashShareToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates whether a token matches the strict 43-character Base64URL format.
 */
export function isValidTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') {
    return false;
  }
  return SHARE_TOKEN_REGEX.test(token.trim());
}

/**
 * Validates whether an ID matches standard UUID format.
 */
export function isValidUUID(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id.trim());
}

/**
 * Checks whether an expiration timestamp is in the past relative to a reference time.
 */
export function isLinkExpired(expiresAt: string | Date, referenceTime: Date = new Date()): boolean {
  const expTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expTime)) {
    return true; // Malformed expiration is treated as expired
  }
  return expTime <= referenceTime.getTime();
}

/**
 * Determines whether a share link is currently active (not revoked and not expired).
 */
export function isLinkActive(
  link: { expires_at: string; revoked_at: string | null | undefined },
  referenceTime: Date = new Date()
): boolean {
  if (link.revoked_at !== null && link.revoked_at !== undefined) {
    return false;
  }
  return !isLinkExpired(link.expires_at, referenceTime);
}

/**
 * Derives the lifecycle status of a share link: 'active' | 'expired' | 'revoked'
 */
export function deriveLinkStatus(
  link: { expires_at: string; revoked_at: string | null | undefined },
  referenceTime: Date = new Date()
): 'active' | 'expired' | 'revoked' {
  if (link.revoked_at !== null && link.revoked_at !== undefined) {
    return 'revoked';
  }
  if (isLinkExpired(link.expires_at, referenceTime)) {
    return 'expired';
  }
  return 'active';
}

/**
 * Calculates an expiration ISO date string given a duration in hours.
 */
export function calculateExpiryDate(expiresInHours: number, referenceTime: Date = new Date()): string {
  const clampedHours = Math.max(1, Math.min(expiresInHours, 720)); // Clamp between 1 hour and 30 days
  const expiryTimestamp = referenceTime.getTime() + clampedHours * 3600 * 1000;
  return new Date(expiryTimestamp).toISOString();
}
