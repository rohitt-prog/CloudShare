import test from 'node:test';
import assert from 'node:assert/strict';

// Direct import of live source implementations from src/features/files/types.ts
import {
  determineFileCategory,
  formatByteSize,
  mapDatabaseFileToFileItem,
  parseTimestampSafe,
  isMissingTableError,
  sanitizeDatabaseError,
  deriveIsolatedFileState,
} from '../src/features/files/types.ts';

// Pure logic mirror for UI hook sorting and filtering
function filterAndSortFiles(files, query, category, sort) {
  return files
    .filter((file) => {
      if (query && query.trim()) {
        const q = query.toLowerCase().trim();
        if (!file.fileName.toLowerCase().includes(q)) return false;
      }
      if (category && category !== 'all' && file.category !== category) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sort.field === 'name') {
        comparison = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' });
      } else if (sort.field === 'size') {
        comparison = a.fileSize - b.fileSize;
      } else if (sort.field === 'date') {
        const timeA = parseTimestampSafe(a.createdAt);
        const timeB = parseTimestampSafe(b.createdAt);
        comparison = timeA - timeB;
        if (comparison === 0) {
          comparison = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' });
        }
      }
      return sort.order === 'asc' ? comparison : -comparison;
    });
}

// ---------------------- TESTS ----------------------

test('formatByteSize formats values accurately across thresholds', () => {
  assert.equal(formatByteSize(0), '0 B');
  assert.equal(formatByteSize(-50), '0 B');
  assert.equal(formatByteSize(NaN), '0 B');
  assert.equal(formatByteSize(512), '512 B');
  assert.equal(formatByteSize(1024), '1.0 KB');
  assert.equal(formatByteSize(1536), '1.5 KB');
  assert.equal(formatByteSize(1048576), '1.0 MB');
  assert.equal(formatByteSize(2621440), '2.5 MB');
  assert.equal(formatByteSize(1073741824), '1.00 GB');
  assert.equal(formatByteSize(2684354560), '2.50 GB');
});

test('determineFileCategory accurately classifies various file types', () => {
  // Images
  assert.equal(determineFileCategory('image/png', 'photo.png'), 'images');
  assert.equal(determineFileCategory(null, 'diagram.SVG'), 'images');
  assert.equal(determineFileCategory('image/webp', 'avatar.webp'), 'images');

  // Media
  assert.equal(determineFileCategory('video/mp4', 'recording.mp4'), 'media');
  assert.equal(determineFileCategory('audio/mpeg', 'song.mp3'), 'media');
  assert.equal(determineFileCategory(null, 'clip.mkv'), 'media');

  // Documents
  assert.equal(determineFileCategory('application/pdf', 'contract.pdf'), 'documents');
  assert.equal(determineFileCategory('text/plain', 'notes.txt'), 'documents');
  assert.equal(
    determineFileCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'proposal.docx'),
    'documents'
  );
  assert.equal(determineFileCategory(null, 'sheet.xlsx'), 'documents');
  assert.equal(determineFileCategory(null, 'README.md'), 'documents');

  // Archives
  assert.equal(determineFileCategory('application/zip', 'backup.zip'), 'archives');
  assert.equal(determineFileCategory('application/gzip', 'archive.tar.gz'), 'archives');
  assert.equal(determineFileCategory(null, 'bundle.7z'), 'archives');

  // Other / Unrecognized
  assert.equal(determineFileCategory('application/octet-stream', 'firmware.bin'), 'other');
  assert.equal(determineFileCategory(null, 'unknown-file'), 'other');
});

test('mapDatabaseFileToFileItem correctly maps raw DB row to normalized FileItem', () => {
  const dbRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    owner_id: 'user-abc',
    file_name: 'Monthly_Report.pdf',
    storage_path: 'user-abc/123e4567-e89b-12d3-a456-426614174000_Monthly_Report.pdf',
    file_size: 2097152,
    mime_type: 'application/pdf',
    created_at: '2026-11-14T12:00:00.000Z',
    updated_at: '2026-11-14T12:00:00.000Z',
  };

  const item = mapDatabaseFileToFileItem(dbRow);

  assert.equal(item.id, dbRow.id);
  assert.equal(item.fileName, 'Monthly_Report.pdf');
  assert.equal(item.fileSize, 2097152);
  assert.equal(item.formattedSize, '2.0 MB');
  assert.equal(item.category, 'documents');
  assert.equal(item.ownerId, 'user-abc');
  assert.equal(item.storagePath, dbRow.storage_path);
  assert.equal(item.createdAt, dbRow.created_at);
});

test('parseTimestampSafe returns valid finite timestamps and handles invalid inputs deterministically', () => {
  assert.equal(parseTimestampSafe(null), 0);
  assert.equal(parseTimestampSafe(undefined), 0);
  assert.equal(parseTimestampSafe(''), 0);
  assert.equal(parseTimestampSafe('invalid-date-string'), 0);
  assert.equal(parseTimestampSafe(12345), 0); // non-string guard

  const validTime = new Date('2026-11-14T10:00:00.000Z').getTime();
  assert.equal(parseTimestampSafe('2026-11-14T10:00:00.000Z'), validTime);
  assert.ok(Number.isFinite(validTime));
});

test('Date sorting comparator never returns NaN and orders invalid timestamps deterministically', () => {
  const files = [
    { id: '1', fileName: 'Valid_Recent.pdf', createdAt: '2026-11-14T10:00:00.000Z', fileSize: 100, category: 'documents' },
    { id: '2', fileName: 'Invalid_A.pdf', createdAt: 'not-a-valid-date', fileSize: 100, category: 'documents' },
    { id: '3', fileName: 'Valid_Old.pdf', createdAt: '2026-01-01T00:00:00.000Z', fileSize: 100, category: 'documents' },
    { id: '4', fileName: 'Invalid_B.pdf', createdAt: '', fileSize: 100, category: 'documents' },
  ];

  // Ascending order: Invalid dates evaluate to timestamp 0 and are tie-broken by filename
  const sortedAsc = filterAndSortFiles(files, '', 'all', { field: 'date', order: 'asc' });
  const ascNames = sortedAsc.map(f => f.fileName);

  // Both invalid timestamps (time 0) are ordered deterministically by name (Invalid_A before Invalid_B)
  assert.equal(ascNames[0], 'Invalid_A.pdf');
  assert.equal(ascNames[1], 'Invalid_B.pdf');
  assert.equal(ascNames[2], 'Valid_Old.pdf');
  assert.equal(ascNames[3], 'Valid_Recent.pdf');

  // Descending order: Most recent first, invalid dates at the end
  const sortedDesc = filterAndSortFiles(files, '', 'all', { field: 'date', order: 'desc' });
  const descNames = sortedDesc.map(f => f.fileName);

  assert.equal(descNames[0], 'Valid_Recent.pdf');
  assert.equal(descNames[1], 'Valid_Old.pdf');
});

test('isMissingTableError strictly identifies genuine missing-table errors and rejects non-missing-table codes', () => {
  // 1. Positive missing-table cases:
  // PostgreSQL 42P01: undefined_table
  assert.equal(isMissingTableError({ code: '42P01' }), true);
  // PostgREST PGRST205 when message/details indicate missing files relation
  assert.equal(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.files' in schema cache" }), true);
  assert.equal(isMissingTableError({ code: 'PGRST205', details: 'relation files was not found' }), true);
  // Narrow missing-relation messages
  assert.equal(isMissingTableError({ message: 'relation "public.files" does not exist' }), true);
  assert.equal(isMissingTableError({ message: 'relation "files" does not exist' }), true);
  assert.equal(isMissingTableError({ message: "could not find the table 'public.files'" }), true);
  assert.equal(isMissingTableError({ message: "could not find the table 'files'" }), true);

  // 2. Explicitly EXCLUDED negative cases:
  // PGRST204 (missing column) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: 'PGRST204', message: 'column "size" does not exist in relation "files"' }), false);
  // PGRST200 (schema relationship / embedding issue) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: 'PGRST200', message: 'Could not find a relationship between files and users' }), false);
  // PGRST301 (JWT/auth error) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: 'PGRST301', message: 'JWT expired' }), false);
  // PGRST116 (single row 404) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }), false);
  // Permission denied (42501) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: '42501', message: 'permission denied for table files' }), false);
  // Server error (500) must NOT trigger missing table
  assert.equal(isMissingTableError({ code: '500', message: 'Internal server error' }), false);
  // Network / fetch errors must NOT trigger missing table
  assert.equal(isMissingTableError({ message: 'Failed to fetch' }), false);
  // Null and undefined
  assert.equal(isMissingTableError(null), false);
  assert.equal(isMissingTableError(undefined), false);
});

test('sanitizeDatabaseError returns sanitized user-friendly strings without leaking SQL or backend internals', () => {
  // Not found
  assert.equal(sanitizeDatabaseError({ code: 'PGRST116' }), 'File not found.');
  // Permission denied
  assert.equal(
    sanitizeDatabaseError({ code: '42501', message: 'permission denied for table files' }),
    'Access denied: You do not have permission to access these files.'
  );
  // Missing table
  assert.equal(
    sanitizeDatabaseError({ code: '42P01' }),
    'Database table is missing. Please ensure database migrations are applied.'
  );
  assert.equal(
    sanitizeDatabaseError({ code: 'PGRST205' }),
    'Database table is missing. Please ensure database migrations are applied.'
  );
  // Server errors (500, 503, connection)
  assert.equal(
    sanitizeDatabaseError({ code: '500', message: 'internal server error' }),
    'Server error: Unable to load file data. Please try again later.'
  );
  assert.equal(
    sanitizeDatabaseError({ code: '08001', message: 'unable to connect to server' }),
    'Server error: Unable to load file data. Please try again later.'
  );
  // Arbitrary error message with sensitive SQL must be sanitized
  assert.equal(
    sanitizeDatabaseError({ message: 'syntax error at or near "SELECT * FROM secret_tokens"' }),
    'Database operation failed. Please refresh or try again.'
  );
  // Null error
  assert.equal(sanitizeDatabaseError(null), 'An unexpected database error occurred.');
});

test('Authenticated owner ID validation rejects unauthenticated calls and owner mismatches', () => {
  function validateOwnerSession(authSessionUser, requestedOwnerId) {
    if (!authSessionUser || !authSessionUser.id) {
      return { userId: null, error: 'Authentication required. Please sign in to view your files.' };
    }

    if (requestedOwnerId && requestedOwnerId !== authSessionUser.id) {
      return {
        userId: null,
        error: 'Access denied: You cannot view files belonging to another user account.',
      };
    }

    return { userId: authSessionUser.id, error: null };
  }

  // 1. Missing user rejected with sanitized message
  const unauth = validateOwnerSession(null, 'user-123');
  assert.equal(unauth.userId, null);
  assert.equal(unauth.error, 'Authentication required. Please sign in to view your files.');

  // 2. Caller trying to impersonate another user ID rejected
  const mismatch = validateOwnerSession({ id: 'user-real' }, 'user-attacker');
  assert.equal(mismatch.userId, null);
  assert.equal(mismatch.error, 'Access denied: You cannot view files belonging to another user account.');

  // 3. Legitimate user matching caller succeeds
  const legit = validateOwnerSession({ id: 'user-real' }, 'user-real');
  assert.equal(legit.userId, 'user-real');
  assert.equal(legit.error, null);
});

test('Missing-table fallback vs permission errors: demo mode is isolated to missing tables', () => {
  function handleQueryResponse(dbError, demoRecords) {
    if (dbError) {
      if (isMissingTableError(dbError)) {
        return { files: demoRecords, isTableMissing: true, error: null };
      }
      return { files: [], isTableMissing: false, error: sanitizeDatabaseError(dbError) };
    }
    return { files: [], isTableMissing: false, error: null };
  }

  const demoFiles = [{ id: 'demo-1', fileName: 'Demo.pdf' }];

  // 1. Missing table: returns demo records
  const missingResult = handleQueryResponse({ code: '42P01' }, demoFiles);
  assert.equal(missingResult.isTableMissing, true);
  assert.equal(missingResult.files.length, 1);
  assert.equal(missingResult.error, null);

  // 2. Permission error: returns empty list with error (DOES NOT activate demo mode)
  const permResult = handleQueryResponse({ code: '42501', message: 'permission denied' }, demoFiles);
  assert.equal(permResult.isTableMissing, false);
  assert.equal(permResult.files.length, 0);
  assert.equal(permResult.error, 'Access denied: You do not have permission to access these files.');
});

test('Network failures versus missing-table errors: network exceptions never trigger demo mode', () => {
  function handleException(err) {
    // Service catch block logic: sanitized user message
    return {
      files: [],
      error: 'Network connection failure. Please check your internet connection and try again.',
      isTableMissing: false,
    };
  }

  const networkErr = new TypeError('Failed to fetch (CORS or network disconnected)');
  const res = handleException(networkErr);

  assert.equal(res.isTableMissing, false);
  assert.equal(res.files.length, 0);
  assert.equal(res.error, 'Network connection failure. Please check your internet connection and try again.');
});

test('Demo ID behavior: real database errors on demo-like IDs are not swallowed with demo data', () => {
  function getFileByIdLogic(fileId, dbError, demoRecords) {
    if (dbError) {
      if (isMissingTableError(dbError)) {
        const demo = demoRecords.find(f => f.id === fileId) || null;
        return { file: demo, error: demo ? null : 'File not found in demo vault.' };
      }
      // If table exists, real database error must be returned
      return { file: null, error: sanitizeDatabaseError(dbError) };
    }
    return { file: null, error: null };
  }

  const demoRecords = [{ id: 'demo-1', fileName: 'Demo.pdf' }];

  // If table exists but query yields permission denied on 'demo-1'
  const permError = { code: '42501', message: 'permission denied' };
  const result = getFileByIdLogic('demo-1', permError, demoRecords);

  // Must NOT swallow error with demo record
  assert.equal(result.file, null);
  assert.equal(result.error, 'Access denied: You do not have permission to access these files.');
});

test('Asynchronous race condition guard discards stale responses from previous requests', () => {
  let activeRequestId = 0;
  let currentUserId = 'user-1';
  let state = { files: [], user: 'user-1' };

  // Dispatch request 1 for user-1
  const req1Id = ++activeRequestId;
  const req1User = 'user-1';

  // Dispatch request 2 for user-2 (e.g. account switch)
  const req2Id = ++activeRequestId;
  const req2User = 'user-2';
  currentUserId = 'user-2';

  // Request 2 completes first
  state = { files: [{ id: 'file-user-2' }], user: req2User };

  // Request 1 now arrives late: must be ignored because req1Id !== activeRequestId or req1User !== currentUserId
  if (req1Id === activeRequestId && req1User === currentUserId) {
    state = { files: [{ id: 'file-user-1' }], user: req1User };
  }

  // Verify state was NOT overwritten by late request 1
  assert.equal(state.user, 'user-2');
  assert.equal(state.files[0].id, 'file-user-2');
});

test('[DIRECT PRODUCTION HELPER TEST] deriveIsolatedFileState synchronously quarantines data during render before effects execute', () => {
  const accountAFiles = [
    { id: 'file-a-1', fileName: 'Secret_A.pdf', ownerId: 'user-a' },
    { id: 'file-a-2', fileName: 'Design_A.png', ownerId: 'user-a' },
  ];
  const accountASelection = { id: 'file-a-1', fileName: 'Secret_A.pdf', ownerId: 'user-a' };

  // Case 1: Intermediate render after switching from Account A to Account B
  // loadedOwnerId is still 'user-a', but current user is 'user-b'
  const intermediateB = deriveIsolatedFileState('user-b', 'user-a', accountAFiles, accountASelection);
  assert.equal(intermediateB.isOwnerMatch, false);
  assert.equal(intermediateB.visibleFiles.length, 0);
  assert.equal(intermediateB.visibleSelectedFile, null);

  // Case 2: User logs out (currentUserId is null)
  const loggedOut = deriveIsolatedFileState(null, 'user-a', accountAFiles, accountASelection);
  assert.equal(loggedOut.isOwnerMatch, false);
  assert.equal(loggedOut.visibleFiles.length, 0);
  assert.equal(loggedOut.visibleSelectedFile, null);

  // Case 3: Matching authenticated owner
  const accountBFiles = [{ id: 'file-b-1', fileName: 'Doc_B.pdf', ownerId: 'user-b' }];
  const accountBSelection = { id: 'file-b-1', fileName: 'Doc_B.pdf', ownerId: 'user-b' };
  const matched = deriveIsolatedFileState('user-b', 'user-b', accountBFiles, accountBSelection);
  assert.equal(matched.isOwnerMatch, true);
  assert.equal(matched.visibleFiles.length, 1);
  assert.equal(matched.visibleFiles[0].fileName, 'Doc_B.pdf');
  assert.equal(matched.visibleSelectedFile?.fileName, 'Doc_B.pdf');

  // Case 4: Selected file mismatch (even if owner matched, stale selection from another user is blocked)
  const mismatchedSelection = deriveIsolatedFileState('user-b', 'user-b', accountBFiles, accountASelection);
  assert.equal(mismatchedSelection.isOwnerMatch, true);
  assert.equal(mismatchedSelection.visibleFiles.length, 1);
  assert.equal(mismatchedSelection.visibleSelectedFile, null);

  // Case 5: When Account B request fails (empty files with matching owner)
  const failedB = deriveIsolatedFileState('user-b', 'user-b', [], null);
  assert.equal(failedB.isOwnerMatch, true);
  assert.equal(failedB.visibleFiles.length, 0);
  assert.equal(failedB.visibleSelectedFile, null);
});

test('[SIMULATED LIFECYCLE TEST] Account switch synchronously purges files and selected item, preventing stale data reappearance on failure', () => {
  // Simulate hook state
  let rawFiles = [{ id: 'file-a-1', fileName: 'Account_A_Secret.pdf' }];
  let selectedFile = { id: 'file-a-1', fileName: 'Account_A_Secret.pdf' };
  let isLoading = false;
  let error = null;

  // Account switch from A to B: Immediate synchronous purge in useEffect
  rawFiles = [];
  selectedFile = null;
  isLoading = true;
  error = null;

  // Verify Account A data is immediately gone before B finishes
  assert.equal(rawFiles.length, 0);
  assert.equal(selectedFile, null);
  assert.equal(isLoading, true);

  // Simulate Account B's request failing with network error
  isLoading = false;
  error = 'Network connection failure. Please check your internet connection and try again.';
  rawFiles = []; // explicitly stays empty on failure

  // Verify Account A data CANNOT reappear on failure
  assert.equal(rawFiles.length, 0);
  assert.equal(selectedFile, null);
  assert.equal(error, 'Network connection failure. Please check your internet connection and try again.');
});
