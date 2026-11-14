import test from 'node:test';
import assert from 'node:assert/strict';

// Direct import of production implementations from src/features/files/types.ts and file.service.ts
import {
  validateFileForUpload,
  sanitizeFileName,
  generateStoragePath,
  sanitizeStorageError,
  MAX_FILE_SIZE_BYTES,
  DISALLOWED_EXTENSIONS,
  formatByteSize,
  determineFileCategory,
  mapDatabaseFileToFileItem,
  deriveIsolatedFileState,
} from '../src/features/files/types.ts';
import { createFileService } from '../src/features/files/services/file.service.ts';

// =============================================================================
// Test Suite 1: File Upload Validation (Size, Extension, Content)
// =============================================================================

test('validateFileForUpload rejects null, undefined, and empty objects', () => {
  assert.strictEqual(validateFileForUpload(null).isValid, false);
  assert.strictEqual(validateFileForUpload(undefined).isValid, false);
  assert.strictEqual(validateFileForUpload({}).isValid, false);
  assert.strictEqual(validateFileForUpload(null).error, 'No file selected for upload.');
});

test('validateFileForUpload rejects empty or whitespace-only filenames', () => {
  const result = validateFileForUpload({ name: '   ', size: 1024 });
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.error, 'File name cannot be empty.');
});

test('validateFileForUpload rejects 0-byte and negative-size files', () => {
  const zeroResult = validateFileForUpload({ name: 'empty.txt', size: 0 });
  assert.strictEqual(zeroResult.isValid, false);
  assert.strictEqual(zeroResult.error, 'Cannot upload empty (0 byte) files.');

  const negativeResult = validateFileForUpload({ name: 'corrupted.txt', size: -100 });
  assert.strictEqual(negativeResult.isValid, false);
  assert.strictEqual(negativeResult.error, 'Cannot upload empty (0 byte) files.');
});

test('validateFileForUpload enforces 50 MB maximum file size limit', () => {
  // Exactly 50 MB (52,428,800 bytes) -> Allowed
  const exactLimitResult = validateFileForUpload({
    name: 'large_backup.zip',
    size: MAX_FILE_SIZE_BYTES,
  });
  assert.strictEqual(exactLimitResult.isValid, true);
  assert.strictEqual(exactLimitResult.error, null);

  // 1 byte over 50 MB -> Rejected
  const overLimitResult = validateFileForUpload({
    name: 'too_large_video.mp4',
    size: MAX_FILE_SIZE_BYTES + 1,
  });
  assert.strictEqual(overLimitResult.isValid, false);
  assert.match(overLimitResult.error || '', /File size exceeds the 50 MB limit/);
});

test('validateFileForUpload rejects dangerous executable extensions case-insensitively', () => {
  for (const ext of DISALLOWED_EXTENSIONS) {
    const lowerResult = validateFileForUpload({ name: `malware.${ext}`, size: 1024 });
    assert.strictEqual(lowerResult.isValid, false, `Failed to reject .${ext}`);
    assert.match(lowerResult.error || '', new RegExp(`extension '\\.${ext}' are not allowed`));

    const upperResult = validateFileForUpload({ name: `malware.${ext.toUpperCase()}`, size: 1024 });
    assert.strictEqual(upperResult.isValid, false, `Failed to reject .${ext.toUpperCase()}`);
  }
});

test('validateFileForUpload accepts valid files across supported categories', () => {
  const validFiles = [
    { name: 'document.pdf', size: 2048, type: 'application/pdf' },
    { name: 'photo.png', size: 500000, type: 'image/png' },
    { name: 'recording.mp4', size: 15000000, type: 'video/mp4' },
    { name: 'data.xlsx', size: 100000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { name: 'archive.tar.gz', size: 2500000, type: 'application/gzip' },
  ];

  for (const file of validFiles) {
    const result = validateFileForUpload(file);
    assert.strictEqual(result.isValid, true, `Expected valid for ${file.name}`);
    assert.strictEqual(result.error, null);
  }
});

// =============================================================================
// Test Suite 2: Filename Sanitization & Storage Path Generation
// =============================================================================

test('sanitizeFileName neutralizes path traversal, null bytes, and invalid characters', () => {
  // Path traversal
  assert.strictEqual(sanitizeFileName('../../../etc/passwd'), 'etc_passwd');
  assert.strictEqual(sanitizeFileName('..\\..\\windows\\system32'), 'windows_system32');

  // Null bytes and control characters
  assert.strictEqual(sanitizeFileName('file\x00name\x1f.pdf'), 'filename.pdf');

  // Forbidden characters (<>:"/\|?*)
  assert.strictEqual(sanitizeFileName('report:version<1>|final?.pdf'), 'report_version_1__final_.pdf');

  // Leading and trailing dots and whitespace
  assert.strictEqual(sanitizeFileName('  ...hidden_notes.txt...  '), 'hidden_notes.txt');

  // Empty or invalid input fallback
  assert.strictEqual(sanitizeFileName(''), 'unnamed_file');
  assert.strictEqual(sanitizeFileName('   '), 'unnamed_file');
});

test('generateStoragePath creates strictly user-prefixed, collision-resistant paths', () => {
  const userId = 'usr-12345';
  const fileId = 'fil-abcde';
  const fileName = 'Annual Financial Report (2026).pdf';

  const path = generateStoragePath(userId, fileId, fileName);
  assert.strictEqual(path, 'usr-12345/fil-abcde/Annual Financial Report (2026).pdf');

  // Confirm root segment matches user ID (critical for storage RLS)
  const segments = path.split('/');
  assert.strictEqual(segments[0], userId);
  assert.strictEqual(segments[1], fileId);
  assert.strictEqual(segments[2], 'Annual Financial Report (2026).pdf');
});

test('generateStoragePath sanitizes malicious traversal in filename', () => {
  const userId = 'victim-user-id';
  const fileId = 'random-uuid';
  const maliciousName = '../../admin/exploit.png';

  const path = generateStoragePath(userId, fileId, maliciousName);
  assert.strictEqual(path, 'victim-user-id/random-uuid/admin_exploit.png');
  // Root segment is still strictly victim-user-id
  assert.strictEqual(path.startsWith('victim-user-id/'), true);
});

// =============================================================================
// Test Suite 3: Storage Error Sanitization
// =============================================================================

test('sanitizeStorageError returns user-friendly messages without leaking backend internals', () => {
  // 404 Not Found
  assert.strictEqual(
    sanitizeStorageError({ statusCode: 404, message: 'Object user-files/usr/1/file.pdf does not exist' }),
    'File object not found in storage.'
  );

  // 403 Forbidden / RLS violation
  assert.strictEqual(
    sanitizeStorageError({ statusCode: 403, message: 'row-level security policy for table objects violated' }),
    'Access denied: You do not have permission to access this storage object.'
  );

  // 413 Payload Too Large
  assert.strictEqual(
    sanitizeStorageError({ statusCode: 413, message: 'Payload entity too large' }),
    'File exceeds the maximum allowed storage upload limit of 50 MB.'
  );

  // Network / connection drop
  assert.strictEqual(
    sanitizeStorageError({ message: 'Failed to fetch storage API endpoint' }),
    'Storage network connection failed. Please check your internet connection.'
  );

  // Unknown / fallback
  assert.strictEqual(
    sanitizeStorageError({ message: 'Internal AWS S3 error bucket=user-files region=us-east-1' }),
    'Storage operation failed. Please try again.'
  );
  assert.strictEqual(sanitizeStorageError(null), 'An unexpected storage error occurred.');
});

// =============================================================================
// Test Suite 4: Production Service Operations with Mocked Supabase Client
// =============================================================================

function createMockSupabaseClient(overrides = {}) {
  const callLog = {
    authGetUser: 0,
    storageUpload: [],
    storageDownload: [],
    storageRemove: [],
    dbInsert: [],
    dbDelete: [],
  };

  const defaultUser = { id: 'test-user-uuid-1', email: 'test@example.com' };
  const authenticatedUser = overrides.user !== undefined ? overrides.user : defaultUser;
  const authError = overrides.authError || null;

  const mockClient = {
    _calls: callLog,
    auth: {
      getUser: async () => {
        callLog.authGetUser++;
        return {
          data: { user: authenticatedUser },
          error: authError,
        };
      },
    },
    storage: {
      from: (bucket) => ({
        upload: async (path, file, opts) => {
          callLog.storageUpload.push({ bucket, path, file, opts });
          if (overrides.uploadError) {
            return { data: null, error: overrides.uploadError };
          }
          return { data: { path }, error: null };
        },
        download: async (path) => {
          callLog.storageDownload.push({ bucket, path });
          if (overrides.downloadError) {
            return { data: null, error: overrides.downloadError };
          }
          return {
            data:
              overrides.downloadBlob ||
              new Blob(['mock-content'], { type: 'application/pdf' }),
            error: null,
          };
        },
        remove: async (paths) => {
          callLog.storageRemove.push({ bucket, paths });
          if (overrides.throwOnRemove) {
            throw new Error('Storage network exception on remove');
          }
          if (overrides.removeError) {
            return { data: null, error: overrides.removeError };
          }
          return { data: paths, error: null };
        },
      }),
    },
    from: (table) => {
      const builder = {
        insert: (row) => {
          callLog.dbInsert.push({ table, row });
          return {
            select: () => ({
              single: async () => {
                if (overrides.insertError) {
                  return { data: null, error: overrides.insertError };
                }
                return {
                  data: {
                    id: row.id,
                    owner_id: row.owner_id,
                    file_name: row.file_name,
                    storage_path: row.storage_path,
                    file_size: row.file_size,
                    mime_type: row.mime_type,
                    created_at: '2026-11-14T10:00:00.000Z',
                    updated_at: '2026-11-14T10:00:00.000Z',
                  },
                  error: null,
                };
              },
            }),
          };
        },
        delete: () => {
          const conditions = {};
          const deleteQuery = {
            eq: (col, val) => {
              conditions[col] = val;
              return {
                eq: (col2, val2) => {
                  conditions[col2] = val2;
                  callLog.dbDelete.push({ table, conditions });
                  if (overrides.deleteError) {
                    return Promise.resolve({ error: overrides.deleteError });
                  }
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
          return deleteQuery;
        },
      };
      return builder;
    },
  };

  return mockClient;
}

test('[PRODUCTION SERVICE] uploadFile persists to storage first, then inserts metadata', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  const testFile = {
    name: 'quarterly_report.pdf',
    size: 1024 * 500,
    type: 'application/pdf',
  };

  const result = await service.uploadFile(testFile, 'test-user-uuid-1');

  assert.strictEqual(result.error, null);
  assert.ok(result.file);
  assert.strictEqual(result.file.fileName, 'quarterly_report.pdf');
  assert.strictEqual(result.file.ownerId, 'test-user-uuid-1');

  // Verify call sequence and arguments
  assert.strictEqual(mockClient._calls.storageUpload.length, 1);
  assert.strictEqual(mockClient._calls.dbInsert.length, 1);
  assert.strictEqual(mockClient._calls.storageRemove.length, 0);

  const uploadCall = mockClient._calls.storageUpload[0];
  assert.strictEqual(uploadCall.bucket, 'user-files');
  assert.ok(uploadCall.path.startsWith('test-user-uuid-1/'));
  assert.ok(uploadCall.path.endsWith('/quarterly_report.pdf'));

  const insertCall = mockClient._calls.dbInsert[0];
  assert.strictEqual(insertCall.table, 'files');
  assert.strictEqual(insertCall.row.owner_id, 'test-user-uuid-1');
  assert.strictEqual(insertCall.row.file_name, 'quarterly_report.pdf');
  assert.strictEqual(insertCall.row.storage_path, uploadCall.path);
});

test('[PRODUCTION SERVICE] uploadFile triggers atomic compensation when database insert fails', async () => {
  const mockClient = createMockSupabaseClient({
    insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
  });
  const service = createFileService(mockClient, true);

  const testFile = {
    name: 'budget.xlsx',
    size: 20480,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const result = await service.uploadFile(testFile, 'test-user-uuid-1');

  assert.strictEqual(result.file, null);
  assert.match(result.error || '', /Database operation failed/);

  // Verify storage upload succeeded, then compensation remove was triggered
  assert.strictEqual(mockClient._calls.storageUpload.length, 1);
  assert.strictEqual(mockClient._calls.dbInsert.length, 1);
  assert.strictEqual(mockClient._calls.storageRemove.length, 1);

  const uploadedPath = mockClient._calls.storageUpload[0].path;
  assert.deepStrictEqual(mockClient._calls.storageRemove[0].paths, [uploadedPath]);
});

test('[PRODUCTION SERVICE] uploadFile handles returned compensation error gracefully without masking primary failure', async () => {
  const mockClient = createMockSupabaseClient({
    insertError: { code: '42501', message: 'permission denied' },
    removeError: { statusCode: 500, message: 'Internal S3 storage error' },
  });
  const service = createFileService(mockClient, true);

  const testFile = { name: 'test.pdf', size: 1024, type: 'application/pdf' };
  const result = await service.uploadFile(testFile, 'test-user-uuid-1');

  // Primary database error is returned to the user
  assert.strictEqual(result.file, null);
  assert.strictEqual(result.error, 'Access denied: You do not have permission to access these files.');
  assert.strictEqual(mockClient._calls.storageRemove.length, 1);
});

test('[PRODUCTION SERVICE] uploadFile handles thrown compensation exception gracefully without crashing', async () => {
  const mockClient = createMockSupabaseClient({
    insertError: { code: '500', message: 'internal server error' },
    throwOnRemove: true,
  });
  const service = createFileService(mockClient, true);

  const testFile = { name: 'notes.txt', size: 500, type: 'text/plain' };
  const result = await service.uploadFile(testFile, 'test-user-uuid-1');

  assert.strictEqual(result.file, null);
  assert.match(result.error || '', /Server error/);
  assert.strictEqual(mockClient._calls.storageRemove.length, 1);
});

test('[PRODUCTION SERVICE] downloadFile rejects cross-user download attempt based on owner ID', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  const victimFile = {
    id: 'file-123',
    ownerId: 'victim-user-id',
    storagePath: 'victim-user-id/file-123/confidential.pdf',
    fileName: 'confidential.pdf',
    fileSize: 1024,
  };

  const result = await service.downloadFile(victimFile, 'test-user-uuid-1');

  assert.strictEqual(result.blob, null);
  assert.strictEqual(result.error, 'Access denied: You do not have permission to download this file.');
  // Storage download must NOT have been called
  assert.strictEqual(mockClient._calls.storageDownload.length, 0);
});

test('[PRODUCTION SERVICE] downloadFile rejects mismatched or malformed storagePath even if caller claims ownership', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  // Attacker sets ownerId to their own ID, but storagePath points to victim's folder
  const tamperedFile = {
    id: 'spoofed-id',
    ownerId: 'test-user-uuid-1',
    storagePath: 'victim-user-id/secret-folder/confidential.pdf',
    fileName: 'confidential.pdf',
    fileSize: 1024,
  };

  const result = await service.downloadFile(tamperedFile, 'test-user-uuid-1');

  assert.strictEqual(result.blob, null);
  assert.strictEqual(result.error, 'Access denied: You do not have permission to download this file.');
  // Storage download must NOT have been called
  assert.strictEqual(mockClient._calls.storageDownload.length, 0);
});

test('[PRODUCTION SERVICE] downloadFile succeeds for authorized owner and valid storage path', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  const legitimateFile = {
    id: 'file-abc',
    ownerId: 'test-user-uuid-1',
    storagePath: 'test-user-uuid-1/file-abc/my_doc.pdf',
    fileName: 'my_doc.pdf',
    fileSize: 2048,
  };

  const result = await service.downloadFile(legitimateFile, 'test-user-uuid-1');

  assert.strictEqual(result.error, null);
  assert.ok(result.blob);
  assert.strictEqual(mockClient._calls.storageDownload.length, 1);
  assert.strictEqual(mockClient._calls.storageDownload[0].path, 'test-user-uuid-1/file-abc/my_doc.pdf');
});

test('[PRODUCTION SERVICE] deleteFile complete success deletes metadata first and removes storage object second', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  const fileToDelete = {
    id: 'file-del-1',
    ownerId: 'test-user-uuid-1',
    storagePath: 'test-user-uuid-1/file-del-1/trash.pdf',
    fileName: 'trash.pdf',
    fileSize: 1024,
  };

  const result = await service.deleteFile(fileToDelete, 'test-user-uuid-1');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isPartial, false);
  assert.strictEqual(result.warning, null);
  assert.strictEqual(result.error, null);

  // Verify deletion sequence: DB delete first, Storage remove second
  assert.strictEqual(mockClient._calls.dbDelete.length, 1);
  assert.strictEqual(mockClient._calls.storageRemove.length, 1);

  const dbCall = mockClient._calls.dbDelete[0];
  assert.strictEqual(dbCall.table, 'files');
  assert.strictEqual(dbCall.conditions.id, 'file-del-1');
  assert.strictEqual(dbCall.conditions.owner_id, 'test-user-uuid-1');

  assert.deepStrictEqual(mockClient._calls.storageRemove[0].paths, ['test-user-uuid-1/file-del-1/trash.pdf']);
});

test('[PRODUCTION SERVICE] deleteFile reports partial success when metadata deletion succeeds but storage removal returns an error', async () => {
  const mockClient = createMockSupabaseClient({
    removeError: { statusCode: 500, message: 'Storage unavailable' },
  });
  const service = createFileService(mockClient, true);

  const fileToDelete = {
    id: 'file-del-partial',
    ownerId: 'test-user-uuid-1',
    storagePath: 'test-user-uuid-1/file-del-partial/data.csv',
    fileName: 'data.csv',
    fileSize: 512,
  };

  const result = await service.deleteFile(fileToDelete, 'test-user-uuid-1');

  // DB was deleted, so success is true, but flagged as partial with clear warning
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isPartial, true);
  assert.strictEqual(
    result.warning,
    'File metadata was removed from your vault, but storage object deletion could not be confirmed.'
  );
  assert.strictEqual(result.error, null);

  assert.strictEqual(mockClient._calls.dbDelete.length, 1);
  assert.strictEqual(mockClient._calls.storageRemove.length, 1);
});

test('[PRODUCTION SERVICE] deleteFile reports partial success when storage removal throws a network exception', async () => {
  const mockClient = createMockSupabaseClient({
    throwOnRemove: true,
  });
  const service = createFileService(mockClient, true);

  const fileToDelete = {
    id: 'file-del-throw',
    ownerId: 'test-user-uuid-1',
    storagePath: 'test-user-uuid-1/file-del-throw/log.txt',
    fileName: 'log.txt',
    fileSize: 100,
  };

  const result = await service.deleteFile(fileToDelete, 'test-user-uuid-1');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isPartial, true);
  assert.match(result.warning || '', /network error/);
  assert.strictEqual(result.error, null);
});

test('[PRODUCTION SERVICE] deleteFile stops before storage removal when metadata deletion fails', async () => {
  const mockClient = createMockSupabaseClient({
    deleteError: { code: '42501', message: 'permission denied' },
  });
  const service = createFileService(mockClient, true);

  const fileToDelete = {
    id: 'file-del-fail',
    ownerId: 'test-user-uuid-1',
    storagePath: 'test-user-uuid-1/file-del-fail/protected.doc',
    fileName: 'protected.doc',
    fileSize: 1024,
  };

  const result = await service.deleteFile(fileToDelete, 'test-user-uuid-1');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.isPartial, false);
  assert.match(result.error || '', /Access denied/);

  // Storage removal must NOT have been called
  assert.strictEqual(mockClient._calls.dbDelete.length, 1);
  assert.strictEqual(mockClient._calls.storageRemove.length, 0);
});

test('[PRODUCTION SERVICE] deleteFile rejects cross-user deletion attempt before database or storage operations', async () => {
  const mockClient = createMockSupabaseClient();
  const service = createFileService(mockClient, true);

  const otherUserFile = {
    id: 'file-other',
    ownerId: 'other-user-uuid',
    storagePath: 'other-user-uuid/file-other/photo.jpg',
    fileName: 'photo.jpg',
    fileSize: 2048,
  };

  const result = await service.deleteFile(otherUserFile, 'test-user-uuid-1');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.isPartial, false);
  assert.strictEqual(result.error, 'Access denied: You do not have permission to delete this file.');

  assert.strictEqual(mockClient._calls.dbDelete.length, 0);
  assert.strictEqual(mockClient._calls.storageRemove.length, 0);
});

test('[PRODUCTION SERVICE] Account switch synchronously purges files and selected item', () => {
  const fileUserA = { id: 'file-a', fileName: 'secret_a.pdf', ownerId: 'user-a' };

  // When user is user-b, user-a files are immediately quarantined
  const state = deriveIsolatedFileState('user-b', 'user-a', [fileUserA], fileUserA);

  assert.strictEqual(state.visibleFiles.length, 0);
  assert.strictEqual(state.visibleSelectedFile, null);
  assert.strictEqual(state.isOwnerMatch, false);
});
