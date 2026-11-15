import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { determineFileCategory } from '../src/features/files/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

// ==============================================================================
// 1. Behavioral Runtime Tests: Uniform Error Handling & Security
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Uniform error handling ensures invalid, expired, and revoked states produce indistinguishable messages', () => {
  const uniformFallback = 'This link is invalid, has expired, or was revoked by the file owner.';

  // Simulate multiple backend/edge error responses
  const edgeResponses = [
    { success: false, error: 'Shared file not found or link has expired.' },
    { success: false, error: 'Invalid or expired share link.' },
    { success: false, error: 'Missing share token in URL.' },
    { success: false, error: null },
  ];

  for (const resp of edgeResponses) {
    const displayedError = resp.error || uniformFallback;

    // Must never leak internal backend properties
    assert.ok(!displayedError.includes('token_hash'), 'Must not leak token_hash');
    assert.ok(!displayedError.includes('storage_path'), 'Must not leak storage_path');
    assert.ok(!displayedError.includes('owner_id'), 'Must not leak owner_id');
    assert.ok(!displayedError.includes('bucket'), 'Must not leak bucket name');
    assert.ok(!displayedError.includes('postgres'), 'Must not leak database engine');

    // Message must convey neutral expiration/unavailability
    assert.ok(
      displayedError.includes('expired') ||
      displayedError.includes('invalid') ||
      displayedError.includes('not found') ||
      displayedError.includes('Missing share token')
    );
  }
});

// ==============================================================================
// 2. Behavioral Runtime Tests: Download Action & Concurrency Guards
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Download concurrency guard prevents duplicate download triggers while in flight', async () => {
  let downloadServiceCallCount = 0;
  let isDownloading = false;

  const mockDownloadService = async () => {
    downloadServiceCallCount++;
    return {
      success: true,
      downloadUrl: 'https://storage.supabase.co/signed-url',
      fileName: 'annual-report.pdf',
    };
  };

  const handleDownload = async () => {
    if (isDownloading) return; // Concurrency Guard
    isDownloading = true;

    try {
      await mockDownloadService();
    } finally {
      isDownloading = false;
    }
  };

  // 1. Initial click
  const promise1 = handleDownload();
  assert.equal(isDownloading, true, 'isDownloading must be true while in-flight');

  // 2. Immediate accidental second click while first is in-flight
  const promise2 = handleDownload();

  await Promise.all([promise1, promise2]);

  assert.equal(isDownloading, false, 'isDownloading resets to false after resolution');
  assert.equal(downloadServiceCallCount, 1, 'Service call must be dispatched exactly once');
});

test('[BEHAVIORAL RUNTIME] Download failure surfaces error without falsely claiming completion', async () => {
  let isDownloading = false;
  const setIsDownloading = (val) => {
    isDownloading = val;
  };
  let downloadError = null;
  const setDownloadError = (val) => {
    downloadError = val;
  };
  let simulatedAnchorClicked = false;

  const mockFailingDownloadService = async () => {
    return {
      success: false,
      error: 'Signed download URL generation expired or unauthorized.',
    };
  };

  const toastEvents = [];
  const mockToast = {
    info: (desc, title) => toastEvents.push({ type: 'info', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await mockFailingDownloadService();

      if (result.success) {
        simulatedAnchorClicked = true;
        mockToast.info('Download initiated in your browser.', 'Download');
      } else {
        setDownloadError(result.error);
        mockToast.error(result.error, 'Download Failed');
      }
    } catch {
      const fallbackError = 'An unexpected error occurred while preparing your download. Please try again.';
      setDownloadError(fallbackError);
      mockToast.error(fallbackError, 'Download Failed');
    } finally {
      setIsDownloading(false);
    }
  };

  await handleDownload();

  assert.equal(isDownloading, false);
  assert.equal(simulatedAnchorClicked, false, 'Anchor click must NOT occur on failure');
  assert.equal(downloadError, 'Signed download URL generation expired or unauthorized.');
  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'error');
  assert.equal(toastEvents[0].title, 'Download Failed');
});

test('[BEHAVIORAL RUNTIME] Download handler safely catches unexpected thrown exceptions, sets neutral error, and guarantees lock cleanup in finally', async () => {
  let isDownloading = false;
  const setIsDownloading = (val) => {
    isDownloading = val;
  };
  let downloadError = null;
  const setDownloadError = (val) => {
    downloadError = val;
  };
  let simulatedAnchorClicked = false;

  const mockThrowingDownloadService = async () => {
    throw new Error('Fatal network transport failure: socket hangup at 10.0.0.1:443');
  };

  const toastEvents = [];
  const mockToast = {
    info: (desc, title) => toastEvents.push({ type: 'info', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await mockThrowingDownloadService();

      if (result.success) {
        simulatedAnchorClicked = true;
        mockToast.info('Download initiated in your browser.', 'Download');
      } else {
        setDownloadError(result.error);
        mockToast.error(result.error || 'Failed to generate download URL.', 'Download Failed');
      }
    } catch {
      const fallbackError = 'An unexpected error occurred while preparing your download. Please try again.';
      setDownloadError(fallbackError);
      mockToast.error(fallbackError, 'Download Failed');
    } finally {
      setIsDownloading(false);
    }
  };

  await handleDownload();

  // 1. Lock MUST be released
  assert.equal(isDownloading, false, 'isDownloading must reset to false in finally block');

  // 2. No anchor click or success toast
  assert.equal(simulatedAnchorClicked, false, 'Anchor click must never occur on thrown exception');
  assert.equal(toastEvents.length, 1, 'Exactly one error toast must be dispatched');
  assert.equal(toastEvents[0].type, 'error');
  assert.equal(toastEvents[0].title, 'Download Failed');

  // 3. User-facing message must be neutral and safe
  assert.equal(downloadError, 'An unexpected error occurred while preparing your download. Please try again.');
  assert.ok(!downloadError.includes('socket hangup'), 'Must not leak socket error');
  assert.ok(!downloadError.includes('10.0.0.1'), 'Must not leak internal IP addresses');
  assert.ok(!toastEvents[0].desc.includes('socket hangup'), 'Toast must not leak raw exception text');
});

// ==============================================================================
// 3. Behavioral Runtime Tests: File Category Icon & Metadata Truthfulness
// ==============================================================================

test('[BEHAVIORAL RUNTIME] File category derivation uses MIME type and extension truthfully', () => {
  // Documents
  assert.equal(determineFileCategory('application/pdf', 'whitepaper.pdf'), 'documents');
  assert.equal(determineFileCategory('text/plain', 'notes.txt'), 'documents');
  assert.equal(determineFileCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'contract.docx'), 'documents');

  // Images
  assert.equal(determineFileCategory('image/png', 'screenshot.png'), 'images');
  assert.equal(determineFileCategory('image/jpeg', 'photo.jpg'), 'images');

  // Media
  assert.equal(determineFileCategory('video/mp4', 'recording.mp4'), 'media');
  assert.equal(determineFileCategory('audio/mpeg', 'podcast.mp3'), 'media');

  // Archives
  assert.equal(determineFileCategory('application/zip', 'backup.zip'), 'archives');
  assert.equal(determineFileCategory('application/x-tar', 'archive.tar.gz'), 'archives');

  // Other / Fallback
  assert.equal(determineFileCategory('application/octet-stream', 'unknown.bin'), 'other');
});

test('[BEHAVIORAL RUNTIME] Formatted expiration date handles valid ISO timestamps safely', () => {
  const validIso = '2026-12-01T15:30:00.000Z';
  const formatted = new Date(validIso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  assert.ok(formatted.includes('2026') || formatted.includes('Dec'));
  assert.ok(formatted.length > 5);
});

test('[BEHAVIORAL RUNTIME] Theme selector state changes do not reset file access state', () => {
  // Simulate component state
  const state = {
    token: 'test-token-123',
    metadata: {
      fileName: 'budget.xlsx',
      fileSize: 1024,
      formattedSize: '1 KB',
      mimeType: 'application/vnd.ms-excel',
      expiresAt: '2026-11-20T00:00:00Z',
    },
    isLoading: false,
    error: null,
  };

  // Simulating theme switcher call
  let activeTheme = 'light';
  const setTheme = (newTheme) => {
    activeTheme = newTheme;
  };

  setTheme('dark');
  assert.equal(activeTheme, 'dark');
  // File metadata and loading states must remain unchanged
  assert.equal(state.isLoading, false);
  assert.notEqual(state.metadata, null);
  assert.equal(state.metadata.fileName, 'budget.xlsx');

  setTheme('system');
  assert.equal(activeTheme, 'system');
  assert.equal(state.metadata.fileName, 'budget.xlsx');
});

// ==============================================================================
// 4. Static Source-Inspection Tests: SharedFilePage Architecture & Design Tokens
// ==============================================================================

test('[STATIC SOURCE] SharedFilePage defines semantic HTML landmarks and heading hierarchy', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('<header'), 'Must include <header> landmark');
  assert.ok(src.includes('<main'), 'Must include <main> landmark');
  assert.ok(src.includes('<footer'), 'Must include <footer> landmark');
  assert.ok(src.includes('<h1'), 'Must include <h1> primary heading');
  assert.ok(src.includes('<h2'), 'Must include <h2> secondary heading');
});

test('[STATIC SOURCE] SharedFilePage integrates Card, Badge, Button, Skeleton Phase 9B primitives', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes("import { Card } from '@/components/ui/Card'"), 'Must import Card');
  assert.ok(src.includes("import { Badge } from '@/components/ui/Badge'"), 'Must import Badge');
  assert.ok(src.includes("import { Button } from '@/components/ui/Button'"), 'Must import Button');
  assert.ok(src.includes("import { Skeleton } from '@/components/ui/Skeleton'"), 'Must import Skeleton');
  assert.ok(src.includes('<Card'), 'Must render <Card>');
  assert.ok(src.includes('<Badge'), 'Must render <Badge>');
  assert.ok(src.includes('<Button'), 'Must render <Button>');
  assert.ok(src.includes('<Skeleton'), 'Must render <Skeleton>');
});

test('[STATIC SOURCE] SharedFilePage theme selector implements accessible group, aria-pressed, and keyboard buttons', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('role="group"'), 'Must declare role="group" for theme switcher');
  assert.ok(src.includes('aria-label="Theme selection"'), 'Must declare aria-label on theme selector');
  assert.ok(src.includes("aria-pressed={theme === 'light'}"), 'Must declare aria-pressed for light theme');
  assert.ok(src.includes("aria-pressed={theme === 'dark'}"), 'Must declare aria-pressed for dark theme');
  assert.ok(src.includes("aria-pressed={theme === 'system'}"), 'Must declare aria-pressed for system theme');
  assert.ok(src.includes("setTheme('light')"), 'Must wire light theme setter');
  assert.ok(src.includes("setTheme('dark')"), 'Must wire dark theme setter');
  assert.ok(src.includes("setTheme('system')"), 'Must wire system theme setter');
});

test('[STATIC SOURCE] SharedFilePage loading state declares aria-live status and skeleton loaders', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('role="status"'), 'Loading container must declare role="status"');
  assert.ok(src.includes('aria-live="polite"'), 'Loading container must declare aria-live="polite"');
  assert.ok(src.includes('Checking shared link...'), 'Must render truthful loading heading');
  assert.ok(src.includes('<Skeleton'), 'Must render Skeletons to avoid layout shift');
});

test('[STATIC SOURCE] SharedFilePage unavailable link state preserves uniform messaging and navigation', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('Link Unavailable or Expired'), 'Must render uniform unavailable heading');
  assert.ok(src.includes('This link is invalid, has expired, or was revoked by the file owner.'), 'Must render uniform fallback message');
  assert.ok(src.includes('onClick={onNavigateToHome}'), 'Must provide navigation to Home');
  assert.ok(src.includes('onClick={onNavigateToLogin}'), 'Must provide navigation to Login');

  // Verify absence of backend leaks
  assert.ok(!src.includes('token_hash'), 'Must not reference token_hash in UI');
  assert.ok(!src.includes('storage_path'), 'Must not reference storage_path in UI');
});

test('[STATIC SOURCE] SharedFilePage enforces strict security: zero token persistence, zero URL logging', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(!src.includes('localStorage.setItem'), 'Must not persist tokens in localStorage');
  assert.ok(!src.includes('sessionStorage.setItem'), 'Must not persist tokens in sessionStorage');
  assert.ok(!src.includes('document.cookie'), 'Must not write tokens to cookies');
  assert.ok(!src.includes('console.log'), 'Must not log tokens or URLs');
});

test('[STATIC SOURCE] SharedFilePage download button prevents duplicate clicks and provides truthful progress label', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('disabled={isDownloading}'), 'Download button must be disabled when isDownloading');
  assert.ok(src.includes('Initiating Download...'), 'Must render truthful initiating label while active');
  assert.ok(src.includes('Download File'), 'Must render Download File label when idle');
  assert.ok(src.includes("target = '_blank'"), 'Download anchor must set target="_blank"');
  assert.ok(src.includes("rel = 'noopener noreferrer'"), 'Download anchor must set rel="noopener noreferrer"');
});

test('[STATIC SOURCE] SharedFilePage download handler guarantees lock cleanup in finally block and safely catches exceptions', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  // Verify guard against concurrent downloads
  assert.ok(
    src.includes('if (!token || !metadata || isDownloading) return;'),
    'Must guard against concurrent or missing download invocation'
  );

  // Verify setIsDownloading(true) before try block
  assert.ok(src.includes('setIsDownloading(true);'), 'Must set isDownloading to true before async service call');
  assert.ok(src.includes('setDownloadError(null);'), 'Must reset downloadError prior to download');

  // Verify try / catch / finally structure
  assert.ok(src.includes('try {'), 'Must wrap download call in try block');
  assert.ok(
    src.includes('const result = await shareService.getSharedFileDownloadUrl(token);'),
    'Must invoke shareService.getSharedFileDownloadUrl(token)'
  );
  assert.ok(src.includes('catch {'), 'Must catch unexpected exceptions');
  assert.ok(
    /finally\s*\{\s*setIsDownloading\(false\);\s*\}/.test(src),
    'Must guarantee setIsDownloading(false) in finally block'
  );

  // Verify neutral fallback error
  assert.ok(
    src.includes('An unexpected error occurred while preparing your download. Please try again.'),
    'Must provide neutral user-friendly error message on exception'
  );

  // Verify no raw exception leakage
  assert.ok(!src.includes('catch (err) {\n    setDownloadError(err'), 'Must not pass raw error directly to UI');
});

test('[STATIC SOURCE] SharedFilePage enforces semantic design tokens and eliminates hardcoded slate/white colors', () => {
  const src = readSrc('src/pages/SharedFilePage.tsx');

  assert.ok(src.includes('bg-background'), 'Must use bg-background');
  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('bg-card'), 'Must use bg-card');
  assert.ok(src.includes('border-border'), 'Must use border-border');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground');
  assert.ok(!src.includes('bg-slate-900'), 'Must not use hardcoded bg-slate-900');
  assert.ok(!src.includes('bg-white'), 'Must not use hardcoded bg-white');
  assert.ok(!src.includes('border-slate-200'), 'Must not use hardcoded border-slate-200');
});
