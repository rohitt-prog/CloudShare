import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Import pure production helpers extracted from backend Edge Functions
import {
  generateCryptoShareToken,
  hashCryptoShareToken,
  validateTokenFormat as validateEdgeTokenFormat,
  validateUUID as validateEdgeUUID,
  validateExpirationHours,
  isLinkRevoked as isEdgeLinkRevoked,
  isLinkExpired as isEdgeLinkExpired,
  calculateExpiresAt,
  ACCESS_SHARED_FILE_SELECT_QUERY,
  EXPECTED_SHARE_LINK_FK_NAME,
} from '../../backend/supabase/functions/_shared/share-security.ts';

// Import production utilities and service factory
import {
  generateShareToken,
  hashShareToken,
  isValidTokenFormat,
  isValidUUID,
  isLinkExpired,
  isLinkActive,
  deriveLinkStatus,
  calculateExpiryDate,
  SHARE_TOKEN_BYTE_LENGTH,
  SHARE_TOKEN_BASE64URL_LENGTH,
  SHARE_TOKEN_REGEX,
} from '../src/features/sharing/utils/sharing-crypto.ts';

import {
  buildShareUrl,
  formatSharedMetadata,
  EXPIRATION_OPTIONS,
} from '../src/features/sharing/types.ts';

import { createShareService } from '../src/features/sharing/services/share.service.ts';

// =============================================================================
// Test Suite 1: Cryptographic Token Generation & Format
// =============================================================================

test('generateShareToken produces exactly 43-character Base64URL string (256 bits entropy)', () => {
  const token = generateShareToken();
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.length, SHARE_TOKEN_BASE64URL_LENGTH);
  assert.strictEqual(SHARE_TOKEN_REGEX.test(token), true);
});

test('generateShareToken produces unique, high-entropy tokens across consecutive calls', () => {
  const set = new Set();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    const token = generateShareToken();
    assert.strictEqual(token.length, 43);
    assert.strictEqual(SHARE_TOKEN_REGEX.test(token), true);
    set.add(token);
  }
  // All 100 tokens must be distinct
  assert.strictEqual(set.size, iterations);
});

test('generateShareToken never contains standard Base64 padding (=) or non-URL characters (+, /)', () => {
  for (let i = 0; i < 50; i++) {
    const token = generateShareToken();
    assert.strictEqual(token.includes('='), false);
    assert.strictEqual(token.includes('+'), false);
    assert.strictEqual(token.includes('/'), false);
  }
});

test('hashShareToken computes consistent 64-character lowercase SHA-256 hex string', async () => {
  const token = 'abcdef123456_-'.repeat(3) + 'abc'; // 43 chars
  const hash1 = await hashShareToken(token);
  const hash2 = await hashShareToken(token);

  assert.strictEqual(typeof hash1, 'string');
  assert.strictEqual(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
  assert.strictEqual(hash1, hash2); // Deterministic
});

test('hashShareToken produces different hashes for different tokens', async () => {
  const tokenA = 'A'.repeat(43);
  const tokenB = 'B'.repeat(43);
  const hashA = await hashShareToken(tokenA);
  const hashB = await hashShareToken(tokenB);

  assert.notStrictEqual(hashA, hashB);
});

// =============================================================================
// Test Suite 2: Token and UUID Format Validation
// =============================================================================

test('isValidTokenFormat accepts valid 43-character Base64URL strings', () => {
  const validToken = generateShareToken();
  assert.strictEqual(isValidTokenFormat(validToken), true);
  assert.strictEqual(isValidTokenFormat('aB3-_'.repeat(8) + 'xyz'), true);
});

test('isValidTokenFormat rejects non-string and malformed inputs', () => {
  assert.strictEqual(isValidTokenFormat(null), false);
  assert.strictEqual(isValidTokenFormat(undefined), false);
  assert.strictEqual(isValidTokenFormat(12345), false);
  assert.strictEqual(isValidTokenFormat({}), false);
  assert.strictEqual(isValidTokenFormat(''), false);
  assert.strictEqual(isValidTokenFormat('   '), false);
});

test('isValidTokenFormat rejects strings with wrong length', () => {
  assert.strictEqual(isValidTokenFormat('short-token'), false);
  assert.strictEqual(isValidTokenFormat('A'.repeat(42)), false); // 42 chars
  assert.strictEqual(isValidTokenFormat('A'.repeat(44)), false); // 44 chars
});

test('isValidTokenFormat rejects strings containing invalid characters (spaces, +, /, =)', () => {
  const base = 'A'.repeat(42);
  assert.strictEqual(isValidTokenFormat(base + '+'), false);
  assert.strictEqual(isValidTokenFormat(base + '/'), false);
  assert.strictEqual(isValidTokenFormat(base + '='), false);
  assert.strictEqual(isValidTokenFormat(base + ' '), false);
  assert.strictEqual(isValidTokenFormat(base + '$'), false);
});

test('isValidUUID validates UUID v4 strings correctly', () => {
  assert.strictEqual(isValidUUID('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.strictEqual(isValidUUID('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'), true);
  assert.strictEqual(isValidUUID('invalid-uuid'), false);
  assert.strictEqual(isValidUUID(''), false);
  assert.strictEqual(isValidUUID(null), false);
});

// =============================================================================
// Test Suite 3: Lifecycle, Expiry, and Status Derivation
// =============================================================================

test('isLinkExpired detects past vs future timestamps relative to reference time', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');

  const pastDate = '2026-11-14T11:59:59.000Z';
  assert.strictEqual(isLinkExpired(pastDate, now), true);

  const exactDate = '2026-11-14T12:00:00.000Z';
  assert.strictEqual(isLinkExpired(exactDate, now), true);

  const futureDate = '2026-11-14T12:00:01.000Z';
  assert.strictEqual(isLinkExpired(futureDate, now), false);

  // Invalid date string and malformed timestamps fail closed (treated as expired)
  assert.strictEqual(isLinkExpired('not-a-date', now), true);
  assert.strictEqual(isLinkExpired('', now), true);
  assert.strictEqual(isLinkExpired('2026-99-99T99:99:99', now), true);
  assert.strictEqual(isLinkExpired('invalid', now), true);
});

test('isLinkActive strictly requires revoked_at to be null and expires_at in future', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  const future = '2026-11-14T13:00:00.000Z';
  const past = '2026-11-14T11:00:00.000Z';

  // Active: future expiry, null revoked_at
  assert.strictEqual(isLinkActive({ expires_at: future, revoked_at: null }, now), true);

  // Inactive: revoked (even if future)
  assert.strictEqual(isLinkActive({ expires_at: future, revoked_at: past }, now), false);

  // Inactive: expired (even if not revoked)
  assert.strictEqual(isLinkActive({ expires_at: past, revoked_at: null }, now), false);

  // Inactive: both expired and revoked
  assert.strictEqual(isLinkActive({ expires_at: past, revoked_at: past }, now), false);
});

test('deriveLinkStatus classifies active, expired, and revoked states correctly', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  const future = '2026-11-14T13:00:00.000Z';
  const past = '2026-11-14T11:00:00.000Z';

  // Revocation takes precedence
  assert.strictEqual(
    deriveLinkStatus({ expires_at: future, revoked_at: past }, now),
    'revoked'
  );
  assert.strictEqual(
    deriveLinkStatus({ expires_at: past, revoked_at: past }, now),
    'revoked'
  );

  // Expired
  assert.strictEqual(
    deriveLinkStatus({ expires_at: past, revoked_at: null }, now),
    'expired'
  );

  // Active
  assert.strictEqual(
    deriveLinkStatus({ expires_at: future, revoked_at: null }, now),
    'active'
  );
});

test('calculateExpiryDate calculates future ISO date string and clamps duration', () => {
  const refTime = new Date('2026-11-14T00:00:00.000Z');

  // 1 hour
  const oneHour = calculateExpiryDate(1, refTime);
  assert.strictEqual(oneHour, '2026-11-14T01:00:00.000Z');

  // 24 hours
  const oneDay = calculateExpiryDate(24, refTime);
  assert.strictEqual(oneDay, '2026-11-15T00:00:00.000Z');

  // Lower clamp (0 or negative -> clamps to 1 hour)
  const clampedMin = calculateExpiryDate(0, refTime);
  assert.strictEqual(clampedMin, '2026-11-14T01:00:00.000Z');

  // Upper clamp (> 720 hours -> clamps to 720 hours / 30 days)
  const clampedMax = calculateExpiryDate(1000, refTime);
  const thirtyDaysMs = 720 * 3600 * 1000;
  assert.strictEqual(clampedMax, new Date(refTime.getTime() + thirtyDaysMs).toISOString());
});

test('buildShareUrl produces standardized guest URL', () => {
  const token = 'testToken123456789012345678901234567890123';
  const url = buildShareUrl(token, 'https://example.com');
  assert.strictEqual(url, 'https://example.com/?share=' + token);
});

test('formatSharedMetadata formats raw metadata with human-readable byte sizes', () => {
  const raw = {
    fileName: 'document.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    expiresAt: '2026-11-15T12:00:00.000Z',
  };
  const formatted = formatSharedMetadata(raw);
  assert.strictEqual(formatted.fileName, 'document.pdf');
  assert.strictEqual(formatted.fileSize, 1048576);
  assert.strictEqual(formatted.formattedSize, '1.0 MB');
  assert.strictEqual(formatted.mimeType, 'application/pdf');
  assert.strictEqual(formatted.expiresAt, raw.expiresAt);
});

// =============================================================================
// Test Suite 4: Sharing Service — Unconfigured Rejection (No Fake Sharing)
// =============================================================================

test('ShareService rejects all operations with clear error when Supabase is unconfigured', async () => {
  const mockClient = /** @type {any} */ ({});
  const service = createShareService(mockClient, false); // isConfigured = false

  const createRes = await service.createShareLink({ fileId: '123e4567-e89b-12d3-a456-426614174000' });
  assert.strictEqual(createRes.success, false);
  assert.match(createRes.error, /unconfigured/i);

  const listRes = await service.listFileShareLinks('123e4567-e89b-12d3-a456-426614174000');
  assert.strictEqual(listRes.success, false);
  assert.match(listRes.error, /unconfigured/i);

  const revokeRes = await service.revokeShareLink('123e4567-e89b-12d3-a456-426614174000');
  assert.strictEqual(revokeRes.success, false);
  assert.match(revokeRes.error, /unconfigured/i);

  const metaRes = await service.getSharedFileMetadata(generateShareToken());
  assert.strictEqual(metaRes.success, false);
  assert.match(metaRes.error, /unconfigured/i);

  const downloadRes = await service.getSharedFileDownloadUrl(generateShareToken());
  assert.strictEqual(downloadRes.success, false);
  assert.match(downloadRes.error, /unconfigured/i);
});

// =============================================================================
// Test Suite 5: Sharing Service — Input Pre-flight Validation
// =============================================================================

test('ShareService pre-flight validates IDs and token formats before calling APIs', async () => {
  let invoked = false;
  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async () => {
        invoked = true;
        return { data: null, error: null };
      },
    },
    auth: {
      getUser: async () => ({ data: { user: { id: 'usr-123' } }, error: null }),
    },
  });

  const service = createShareService(mockClient, true);

  // Invalid fileId for create
  const createRes = await service.createShareLink({ fileId: 'invalid-id' });
  assert.strictEqual(createRes.success, false);
  assert.match(createRes.error, /invalid file id/i);
  assert.strictEqual(invoked, false);

  // Invalid expiresInHours
  const createRes2 = await service.createShareLink({
    fileId: '123e4567-e89b-12d3-a456-426614174000',
    expiresInHours: 0,
  });
  assert.strictEqual(createRes2.success, false);
  assert.match(createRes2.error, /expiration must be between 1 hour and 720 hours/i);
  assert.strictEqual(invoked, false);

  // Invalid fileId for listing
  const listRes = await service.listFileShareLinks('not-a-uuid');
  assert.strictEqual(listRes.success, false);
  assert.match(listRes.error, /invalid file id/i);

  // Invalid linkId for revocation
  const revokeRes = await service.revokeShareLink('bad-uuid');
  assert.strictEqual(revokeRes.success, false);
  assert.match(revokeRes.error, /invalid share link id/i);

  // Invalid token for metadata
  const metaRes = await service.getSharedFileMetadata('short-token');
  assert.strictEqual(metaRes.success, false);
  assert.match(metaRes.error, /invalid or expired/i);
  assert.strictEqual(invoked, false);

  // Invalid token for download
  const downloadRes = await service.getSharedFileDownloadUrl('token-with-spaces     ');
  assert.strictEqual(downloadRes.success, false);
  assert.match(downloadRes.error, /invalid or expired/i);
  assert.strictEqual(invoked, false);
});

// =============================================================================
// Test Suite 6: Sharing Service — Mocked Edge Function Invocations
// =============================================================================

test('ShareService.createShareLink calls create-share-link Edge Function and formats response', async () => {
  const expectedToken = generateShareToken();
  const fileId = '123e4567-e89b-12d3-a456-426614174000';
  let passedFunctionName = '';
  let passedBody = null;

  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async (name, opts) => {
        passedFunctionName = name;
        passedBody = opts.body;
        return {
          data: {
            shareId: 'link-uuid-999',
            token: expectedToken,
            expiresAt: '2026-11-15T12:00:00.000Z',
          },
          error: null,
        };
      },
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.createShareLink({ fileId, expiresInHours: 48 });

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.shareId, 'link-uuid-999');
    assert.strictEqual(result.rawToken, expectedToken);
    assert.strictEqual(result.expiresAt, '2026-11-15T12:00:00.000Z');
    assert.match(result.shareUrl, new RegExp(`\\?share=${expectedToken}`));
  }

  assert.strictEqual(passedFunctionName, 'create-share-link');
  assert.deepStrictEqual(passedBody, { fileId, expiresInHours: 48 });
});

test('ShareService.createShareLink surfaces Edge Function error gracefully', async () => {
  const fileId = '123e4567-e89b-12d3-a456-426614174000';
  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async () => ({
        data: null,
        error: { message: 'File not found or permission denied' },
      }),
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.createShareLink({ fileId });

  assert.strictEqual(result.success, false);
  if (!result.success) {
    assert.strictEqual(result.error, 'File not found or permission denied');
  }
});

test('ShareService.listFileShareLinks queries user links and derives statuses', async () => {
  const fileId = '123e4567-e89b-12d3-a456-426614174000';
  const ownerId = 'usr-current-111';

  let queriedTable = '';
  let eqFilters = [];

  const mockClient = /** @type {any} */ ({
    auth: {
      getUser: async () => ({ data: { user: { id: ownerId } }, error: null }),
    },
    from: (table) => {
      queriedTable = table;
      return {
        select: () => ({
          eq: (col1, val1) => {
            eqFilters.push({ col: col1, val: val1 });
            return {
              eq: (col2, val2) => {
                eqFilters.push({ col: col2, val: val2 });
                return {
                  order: () => Promise.resolve({
                    data: [
                      {
                        id: 'link-1',
                        file_id: fileId,
                        owner_id: ownerId,
                        expires_at: '2099-01-01T00:00:00.000Z',
                        revoked_at: null,
                        created_at: '2026-11-14T00:00:00.000Z',
                      },
                      {
                        id: 'link-2',
                        file_id: fileId,
                        owner_id: ownerId,
                        expires_at: '2020-01-01T00:00:00.000Z',
                        revoked_at: null,
                        created_at: '2020-01-01T00:00:00.000Z',
                      },
                      {
                        id: 'link-3',
                        file_id: fileId,
                        owner_id: ownerId,
                        expires_at: '2099-01-01T00:00:00.000Z',
                        revoked_at: '2026-11-14T01:00:00.000Z',
                        created_at: '2026-11-14T00:00:00.000Z',
                      },
                    ],
                    error: null,
                  }),
                };
              },
            };
          },
        }),
      };
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.listFileShareLinks(fileId);

  assert.strictEqual(result.success, true);
  assert.strictEqual(queriedTable, 'share_links');
  assert.deepStrictEqual(eqFilters, [
    { col: 'file_id', val: fileId },
    { col: 'owner_id', val: ownerId },
  ]);

  if (result.success) {
    assert.strictEqual(result.links.length, 3);
    assert.strictEqual(result.links[0].status, 'active');
    assert.strictEqual(result.links[1].status, 'expired');
    assert.strictEqual(result.links[2].status, 'revoked');
  }
});

test('ShareService.revokeShareLink updates revoked_at with owner scoping', async () => {
  const linkId = '123e4567-e89b-12d3-a456-426614174000';
  const ownerId = 'usr-current-111';

  let updatePayload = null;
  let eqFilters = [];

  const mockClient = /** @type {any} */ ({
    auth: {
      getUser: async () => ({ data: { user: { id: ownerId } }, error: null }),
    },
    from: (table) => {
      assert.strictEqual(table, 'share_links');
      return {
        update: (payload) => {
          updatePayload = payload;
          return {
            eq: (col1, val1) => {
              eqFilters.push({ col: col1, val: val1 });
              return {
                eq: (col2, val2) => {
                  eqFilters.push({ col: col2, val: val2 });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.revokeShareLink(linkId);

  assert.strictEqual(result.success, true);
  assert.strictEqual(typeof updatePayload.revoked_at, 'string');
  assert.deepStrictEqual(eqFilters, [
    { col: 'id', val: linkId },
    { col: 'owner_id', val: ownerId },
  ]);
});

test('ShareService.getSharedFileMetadata retrieves safe metadata via access-shared-file Edge Function', async () => {
  const validToken = generateShareToken();
  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async (name, opts) => {
        assert.strictEqual(name, 'access-shared-file');
        assert.strictEqual(opts.body.shareToken, validToken);
        assert.strictEqual(opts.body.action, 'metadata');
        return {
          data: {
            fileName: 'financial_report.xlsx',
            fileSize: 2097152,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            expiresAt: '2026-11-15T18:00:00.000Z',
          },
          error: null,
        };
      },
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.getSharedFileMetadata(validToken);

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.metadata.fileName, 'financial_report.xlsx');
    assert.strictEqual(result.metadata.fileSize, 2097152);
    assert.strictEqual(result.metadata.formattedSize, '2.0 MB');
    assert.strictEqual(result.metadata.expiresAt, '2026-11-15T18:00:00.000Z');
  }
});

test('ShareService.getSharedFileMetadata returns uniform error on 404/expired/revoked', async () => {
  const validToken = generateShareToken();
  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async () => ({
        data: null,
        error: { message: 'Shared file not found or link has expired.' },
      }),
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.getSharedFileMetadata(validToken);

  assert.strictEqual(result.success, false);
  if (!result.success) {
    assert.strictEqual(result.error, 'Shared file not found or link has expired.');
  }
});

test('ShareService.getSharedFileDownloadUrl returns short-lived signed download URL', async () => {
  const validToken = generateShareToken();
  const mockClient = /** @type {any} */ ({
    functions: {
      invoke: async (name, opts) => {
        assert.strictEqual(name, 'access-shared-file');
        assert.strictEqual(opts.body.shareToken, validToken);
        assert.strictEqual(opts.body.action, 'download');
        return {
          data: {
            downloadUrl: 'https://example.supabase.co/storage/v1/object/sign/user-files/token?token=xyz',
            expiresInSeconds: 60,
            fileName: 'contract.pdf',
          },
          error: null,
        };
      },
    },
  });

  const service = createShareService(mockClient, true);
  const result = await service.getSharedFileDownloadUrl(validToken);

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.downloadUrl, 'https://example.supabase.co/storage/v1/object/sign/user-files/token?token=xyz');
    assert.strictEqual(result.expiresInSeconds, 60);
    assert.strictEqual(result.fileName, 'contract.pdf');
  }
});

// =============================================================================
// Test Suite 7: Edge Function Production Helpers (Direct Backend Logic Tests)
// =============================================================================

test('[PRODUCTION EDGE HELPER] generateCryptoShareToken produces high-entropy 43-char token', () => {
  const token = generateCryptoShareToken();
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.length, 43);
  assert.strictEqual(/^[A-Za-z0-9_-]{43}$/.test(token), true);
});

test('[PRODUCTION EDGE HELPER] hashCryptoShareToken matches frontend hashShareToken output', async () => {
  const testToken = 'XyZ_1234567890-abcdefghijKLMNOPQRSTUVwxYz12';
  const edgeHash = await hashCryptoShareToken(testToken);
  const frontendHash = await hashShareToken(testToken);

  assert.strictEqual(edgeHash.length, 64);
  assert.match(edgeHash, /^[0-9a-f]{64}$/);
  assert.strictEqual(edgeHash, frontendHash); // Cross-boundary algorithm compatibility
});

test('[PRODUCTION EDGE HELPER] validateEdgeTokenFormat strictly checks 43-char Base64URL string', () => {
  const valid = generateCryptoShareToken();
  assert.strictEqual(validateEdgeTokenFormat(valid), true);
  assert.strictEqual(validateEdgeTokenFormat('bad-token'), false);
  assert.strictEqual(validateEdgeTokenFormat(''), false);
  assert.strictEqual(validateEdgeTokenFormat(null), false);
  assert.strictEqual(validateEdgeTokenFormat(undefined), false);
  assert.strictEqual(validateEdgeTokenFormat(valid + '='), false);
  assert.strictEqual(validateEdgeTokenFormat(valid.slice(0, 42)), false);
});

test('[PRODUCTION EDGE HELPER] validateExpirationHours rejects invalid durations and accepts 1..720', () => {
  // Valid bounds
  assert.strictEqual(validateExpirationHours(1).isValid, true);
  assert.strictEqual(validateExpirationHours(24).isValid, true);
  assert.strictEqual(validateExpirationHours(720).isValid, true);
  assert.strictEqual(validateExpirationHours(undefined).isValid, true); // Defaults to 24

  // Invalid out-of-range bounds
  assert.strictEqual(validateExpirationHours(0).isValid, false);
  assert.strictEqual(validateExpirationHours(-10).isValid, false);
  assert.strictEqual(validateExpirationHours(721).isValid, false);
  assert.strictEqual(validateExpirationHours('not-a-number').isValid, false);
  assert.match(validateExpirationHours(0).error || '', /between 1 and 720/i);
});

test('[PRODUCTION EDGE HELPER] isEdgeLinkRevoked correctly identifies revoked timestamps', () => {
  assert.strictEqual(isEdgeLinkRevoked('2026-11-14T12:00:00.000Z'), true);
  assert.strictEqual(isEdgeLinkRevoked(null), false);
  assert.strictEqual(isEdgeLinkRevoked(undefined), false);
});

test('[PRODUCTION EDGE HELPER] isEdgeLinkExpired fails closed on past, boundary, and malformed timestamps', () => {
  const now = new Date('2026-11-14T12:00:00.000Z').getTime();

  // Past timestamp -> expired
  assert.strictEqual(isEdgeLinkExpired('2026-11-14T11:59:59.000Z', now), true);

  // Future timestamp -> not expired
  assert.strictEqual(isEdgeLinkExpired('2026-11-14T12:00:01.000Z', now), false);

  // Current/past boundary -> expired
  assert.strictEqual(isEdgeLinkExpired('2026-11-14T12:00:00.000Z', now), true);

  // Invalid date string ("not-a-date") -> expired
  assert.strictEqual(isEdgeLinkExpired('not-a-date', now), true);

  // Empty string ("") -> expired
  assert.strictEqual(isEdgeLinkExpired('', now), true);

  // Malformed timestamp ("2026-99-99T99:99:99", "invalid") -> expired
  assert.strictEqual(isEdgeLinkExpired('2026-99-99T99:99:99', now), true);
  assert.strictEqual(isEdgeLinkExpired('invalid', now), true);
});

// =============================================================================
// Test Suite 8: Schema Integrity & Referrer Policy Regression Tests
// =============================================================================

test('[REGRESSION TEST] access-shared-file query uses exact migration foreign key fk_share_links_file_owner', () => {
  // 1. Verify query string constant defined in Edge Function shared helpers
  assert.strictEqual(
    ACCESS_SHARED_FILE_SELECT_QUERY.includes(`files!${EXPECTED_SHARE_LINK_FK_NAME}`),
    true,
    'ACCESS_SHARED_FILE_SELECT_QUERY must specify files!fk_share_links_file_owner'
  );

  // 2. Read live access-shared-file index.ts source code to verify it uses the corrected query
  const edgeFnPath = new URL('../../backend/supabase/functions/access-shared-file/index.ts', import.meta.url);
  const edgeFnSource = fs.readFileSync(edgeFnPath, 'utf8');

  assert.strictEqual(
    edgeFnSource.includes('files:file_id'),
    false,
    'access-shared-file must NOT contain broken files:file_id embedding'
  );
  assert.strictEqual(
    edgeFnSource.includes('ACCESS_SHARED_FILE_SELECT_QUERY') || edgeFnSource.includes(`files!${EXPECTED_SHARE_LINK_FK_NAME}`),
    true,
    'access-shared-file must use ACCESS_SHARED_FILE_SELECT_QUERY or explicit fk_share_links_file_owner'
  );
});

test('[REGRESSION TEST] Base schema migration explicitly defines fk_share_links_file_owner constraint', () => {
  const migrationPath = new URL('../../backend/supabase/migrations/20261114191500_create_base_schema.sql', import.meta.url);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.strictEqual(
    migrationSql.includes('CONSTRAINT fk_share_links_file_owner FOREIGN KEY (file_id, owner_id)'),
    true,
    'Migration 20261114191500_create_base_schema.sql must define fk_share_links_file_owner'
  );
});

test('[REGRESSION TEST] frontend/index.html includes strict no-referrer meta policy', () => {
  const htmlPath = new URL('../index.html', import.meta.url);
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.strictEqual(
    htmlContent.includes('<meta name="referrer" content="no-referrer" />') ||
    htmlContent.includes('<meta name="referrer" content="no-referrer">'),
    true,
    'index.html must include strict no-referrer meta policy to prevent token leakage in Referer headers'
  );
});
