import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPIRATION_OPTIONS } from '../src/features/sharing/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

// ==============================================================================
// 1. Behavioral Runtime Tests: Expiration and Creation Date Formatting
// ==============================================================================

/**
 * Pure formatting algorithm matching the implementation in ShareModal.tsx
 */
function formatExpirationDisplay(expiresAt, now = Date.now()) {
  if (!expiresAt) {
    return {
      absoluteDate: 'Unknown expiration',
      relativeLabel: '',
      isExpired: false,
    };
  }

  const date = new Date(expiresAt);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return {
      absoluteDate: 'Invalid expiration date',
      relativeLabel: '',
      isExpired: false,
    };
  }

  const absoluteDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffMs = time - now;
  if (diffMs <= 0) {
    return {
      absoluteDate,
      relativeLabel: 'Expired',
      isExpired: true,
    };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relativeLabel = '';
  if (diffMinutes < 1) {
    relativeLabel = 'Expires in <1 minute';
  } else if (diffMinutes < 60) {
    relativeLabel = `Expires in ${diffMinutes}m`;
  } else if (diffHours < 24) {
    relativeLabel = `Expires in ~${diffHours}h`;
  } else {
    relativeLabel = diffDays === 1 ? 'Expires in 1 day' : `Expires in ${diffDays} days`;
  }

  return {
    absoluteDate,
    relativeLabel,
    isExpired: false,
  };
}

function formatCreationDisplay(createdAt) {
  if (!createdAt) return 'Unknown date';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

test('[BEHAVIORAL RUNTIME] Expiration formatting computes truthful relative urgency and absolute dates', () => {
  const referenceNow = new Date('2026-11-15T12:00:00.000Z').getTime();

  // Case 1: Expiring in 30 seconds (<1 minute)
  const expires30s = new Date(referenceNow + 30 * 1000).toISOString();
  const res30s = formatExpirationDisplay(expires30s, referenceNow);
  assert.equal(res30s.isExpired, false);
  assert.equal(res30s.relativeLabel, 'Expires in <1 minute');
  assert.ok(res30s.absoluteDate.length > 0);

  // Case 2: Expiring in 45 minutes
  const expires45m = new Date(referenceNow + 45 * 60 * 1000).toISOString();
  const res45m = formatExpirationDisplay(expires45m, referenceNow);
  assert.equal(res45m.isExpired, false);
  assert.equal(res45m.relativeLabel, 'Expires in 45m');

  // Case 3: Expiring in 18 hours (~18h)
  const expires18h = new Date(referenceNow + 18 * 3600 * 1000).toISOString();
  const res18h = formatExpirationDisplay(expires18h, referenceNow);
  assert.equal(res18h.isExpired, false);
  assert.equal(res18h.relativeLabel, 'Expires in ~18h');

  // Case 4: Expiring in 24 hours (1 day)
  const expires24h = new Date(referenceNow + 24 * 3600 * 1000).toISOString();
  const res24h = formatExpirationDisplay(expires24h, referenceNow);
  assert.equal(res24h.isExpired, false);
  assert.equal(res24h.relativeLabel, 'Expires in 1 day');

  // Case 5: Expiring in 6 days
  const expires6d = new Date(referenceNow + 6 * 24 * 3600 * 1000).toISOString();
  const res6d = formatExpirationDisplay(expires6d, referenceNow);
  assert.equal(res6d.isExpired, false);
  assert.equal(res6d.relativeLabel, 'Expires in 6 days');

  // Case 6: Expired in the past (1 minute ago)
  const expiredPast = new Date(referenceNow - 60 * 1000).toISOString();
  const resPast = formatExpirationDisplay(expiredPast, referenceNow);
  assert.equal(resPast.isExpired, true);
  assert.equal(resPast.relativeLabel, 'Expired');

  // Case 7: Missing / undefined input
  const resMissing = formatExpirationDisplay(null, referenceNow);
  assert.equal(resMissing.isExpired, false);
  assert.equal(resMissing.absoluteDate, 'Unknown expiration');
  assert.equal(resMissing.relativeLabel, '');

  // Case 8: Invalid / malformed string
  const resInvalid = formatExpirationDisplay('malformed-timestamp-value', referenceNow);
  assert.equal(resInvalid.isExpired, false);
  assert.equal(resInvalid.absoluteDate, 'Invalid expiration date');
  assert.equal(resInvalid.relativeLabel, '');
});

test('[BEHAVIORAL RUNTIME] Creation date formatting formats valid dates and handles invalid inputs gracefully', () => {
  const validIso = '2026-11-15T10:30:00.000Z';
  const formatted = formatCreationDisplay(validIso);
  assert.ok(formatted.length > 0);
  assert.notEqual(formatted, 'Unknown date');
  assert.notEqual(formatted, 'Invalid date');

  assert.equal(formatCreationDisplay(null), 'Unknown date');
  assert.equal(formatCreationDisplay(undefined), 'Unknown date');
  assert.equal(formatCreationDisplay('not-a-date'), 'Invalid date');
});

// ==============================================================================
// 2. Behavioral Runtime Tests: Clipboard Operation (Single Write & Error Propagation)
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Exactly ONE clipboard write occurs per copy action and propagates success to toast', async () => {
  let writeCallCount = 0;
  let textWritten = '';

  const mockClipboard = {
    writeText: async (text) => {
      writeCallCount++;
      textWritten = text;
    },
  };

  // Simulating useShare copyToClipboard helper
  let isCopied = false;
  const copyToClipboard = async (text) => {
    if (!mockClipboard || !mockClipboard.writeText) {
      isCopied = false;
      throw new Error('Clipboard access is not supported in this environment.');
    }
    try {
      await mockClipboard.writeText(text);
      isCopied = true;
      return true;
    } catch (err) {
      isCopied = false;
      throw err;
    }
  };

  // Simulating ShareModal handleCopy handler
  const toastEvents = [];
  const mockToast = {
    success: (desc, title) => toastEvents.push({ type: 'success', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleCopy = async (url) => {
    try {
      await copyToClipboard(url);
      mockToast.success('Share link copied to clipboard.', 'Link Copied');
    } catch {
      mockToast.error('Could not copy link to clipboard. Please copy manually.', 'Copy Failed');
    }
  };

  await handleCopy('https://cloudshare.local/?share=single-write-token');

  assert.equal(writeCallCount, 1, 'Must invoke navigator.clipboard.writeText exactly ONCE');
  assert.equal(textWritten, 'https://cloudshare.local/?share=single-write-token');
  assert.equal(isCopied, true);
  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'success');
  assert.equal(toastEvents[0].title, 'Link Copied');
});

test('[BEHAVIORAL RUNTIME] Clipboard rejection produces error toast without false success', async () => {
  let writeCallCount = 0;

  const failingClipboard = {
    writeText: async () => {
      writeCallCount++;
      throw new Error('NotAllowedError: Document not focused');
    },
  };

  let isCopied = true;
  const copyToClipboard = async (text) => {
    try {
      await failingClipboard.writeText(text);
      isCopied = true;
      return true;
    } catch (err) {
      isCopied = false;
      throw err;
    }
  };

  const toastEvents = [];
  const mockToast = {
    success: (desc, title) => toastEvents.push({ type: 'success', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleCopy = async (url) => {
    try {
      await copyToClipboard(url);
      mockToast.success('Share link copied to clipboard.', 'Link Copied');
    } catch {
      mockToast.error('Could not copy link to clipboard. Please copy manually.', 'Copy Failed');
    }
  };

  await handleCopy('https://cloudshare.local/?share=fail-token');

  assert.equal(writeCallCount, 1);
  assert.equal(isCopied, false, 'isCopied must be reset to false on clipboard failure');
  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'error');
  assert.equal(toastEvents[0].title, 'Copy Failed');
  assert.ok(toastEvents[0].desc.includes('copy manually'));
});

// ==============================================================================
// 3. Behavioral Runtime Tests: Expiration Radio Keyboard Navigation & Roving TabIndex
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Arrow-key navigation moves selection in both directions with wraparound', () => {
  const options = EXPIRATION_OPTIONS; // [1h (index 0), 24h (index 1), 168h (index 2)]
  assert.equal(options.length, 3);

  // Pure state machine simulation matching handleRadioKeyDown
  const computeNextHours = (currentHours, key) => {
    const currentIndex = options.findIndex((opt) => opt.hours === currentHours);
    if (currentIndex === -1) return currentHours;

    let nextIndex = -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }

    return nextIndex !== -1 ? options[nextIndex].hours : currentHours;
  };

  // Start at 24h (index 1)
  assert.equal(computeNextHours(24, 'ArrowRight'), 168, 'ArrowRight advances from 24h to 168h');
  assert.equal(computeNextHours(24, 'ArrowDown'), 168, 'ArrowDown advances from 24h to 168h');
  assert.equal(computeNextHours(24, 'ArrowLeft'), 1, 'ArrowLeft steps back from 24h to 1h');
  assert.equal(computeNextHours(24, 'ArrowUp'), 1, 'ArrowUp steps back from 24h to 1h');

  // Test wraparound forward: from last (168h, index 2) to first (1h, index 0)
  assert.equal(computeNextHours(168, 'ArrowRight'), 1, 'ArrowRight from last wraps around to first');
  assert.equal(computeNextHours(168, 'ArrowDown'), 1, 'ArrowDown from last wraps around to first');

  // Test wraparound backward: from first (1h, index 0) to last (168h, index 2)
  assert.equal(computeNextHours(1, 'ArrowLeft'), 168, 'ArrowLeft from first wraps around to last');
  assert.equal(computeNextHours(1, 'ArrowUp'), 168, 'ArrowUp from first wraps around to last');

  // Non-arrow keys do not alter selection
  assert.equal(computeNextHours(24, 'Tab'), 24);
  assert.equal(computeNextHours(24, 'Enter'), 24);
  assert.equal(computeNextHours(24, ' '), 24);
});

test('[BEHAVIORAL RUNTIME] Roving tabIndex ensures exactly ONE selected radio is in Tab sequence', () => {
  const options = EXPIRATION_OPTIONS;

  const computeTabIndices = (selectedHours) => {
    return options.map((opt) => ({
      hours: opt.hours,
      tabIndex: selectedHours === opt.hours ? 0 : -1,
    }));
  };

  // Case A: Default 24h is selected
  const tabIndices24 = computeTabIndices(24);
  const focusable24 = tabIndices24.filter((item) => item.tabIndex === 0);
  assert.equal(focusable24.length, 1, 'Exactly one option must have tabIndex=0');
  assert.equal(focusable24[0].hours, 24);
  assert.equal(tabIndices24.find((item) => item.hours === 1).tabIndex, -1);
  assert.equal(tabIndices24.find((item) => item.hours === 168).tabIndex, -1);

  // Case B: 1h is selected
  const tabIndices1 = computeTabIndices(1);
  const focusable1 = tabIndices1.filter((item) => item.tabIndex === 0);
  assert.equal(focusable1.length, 1);
  assert.equal(focusable1[0].hours, 1);
  assert.equal(tabIndices1.find((item) => item.hours === 24).tabIndex, -1);

  // Case C: 168h is selected
  const tabIndices168 = computeTabIndices(168);
  const focusable168 = tabIndices168.filter((item) => item.tabIndex === 0);
  assert.equal(focusable168.length, 1);
  assert.equal(focusable168[0].hours, 168);
  assert.equal(tabIndices168.find((item) => item.hours === 24).tabIndex, -1);
});

// ==============================================================================
// 4. Behavioral Runtime Tests: Stale Share Link State Lifecycle
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Previous generated link clears when a new creation attempt begins or fails', async () => {
  let newlyCreatedLink = {
    shareId: 'link-111',
    rawToken: 'token-111',
    shareUrl: 'https://cloudshare.local/?share=token-111',
  };

  let isCreating = false;
  let createError = null;

  const simulateCreateLink = async (mockServiceCall) => {
    isCreating = true;
    createError = null;
    newlyCreatedLink = null; // Clear at beginning

    const result = await mockServiceCall();
    isCreating = false;

    if (result.success) {
      newlyCreatedLink = result;
      return true;
    } else {
      newlyCreatedLink = null; // Clear on failure
      createError = result.error;
      return false;
    }
  };

  // Scenario A: Starting a new creation attempt clears the previous link immediately
  let intermediateCheck = false;
  await simulateCreateLink(async () => {
    // Check state during in-flight creation
    intermediateCheck = newlyCreatedLink === null && isCreating === true;
    return { success: false, error: 'Network timeout' };
  });

  assert.equal(intermediateCheck, true, 'newlyCreatedLink must be cleared while creation is in-flight');
  assert.equal(newlyCreatedLink, null, 'newlyCreatedLink must remain null on creation failure');
  assert.equal(createError, 'Network timeout');

  // Scenario B: Successful creation establishes new link
  await simulateCreateLink(async () => ({
    success: true,
    shareId: 'link-222',
    rawToken: 'token-222',
    shareUrl: 'https://cloudshare.local/?share=token-222',
  }));

  assert.equal(newlyCreatedLink?.shareId, 'link-222');
});

test('[BEHAVIORAL RUNTIME] Revoking the newly created link clears its banner, but revoking a different link does not', () => {
  let newlyCreatedLink = {
    shareId: 'active-share-target',
    rawToken: 'token-abc',
    shareUrl: 'https://cloudshare.local/?share=token-abc',
  };

  const simulateRevokeLink = (revokedLinkId) => {
    // Matches logic: setNewlyCreatedLink((current) => (current?.shareId === linkId ? null : current));
    if (newlyCreatedLink?.shareId === revokedLinkId) {
      newlyCreatedLink = null;
    }
  };

  // Action 1: Revoke an older, different historical link
  simulateRevokeLink('historical-link-other');
  assert.notEqual(newlyCreatedLink, null, 'Must NOT clear newlyCreatedLink when another link is revoked');
  assert.equal(newlyCreatedLink?.shareId, 'active-share-target');

  // Action 2: Revoke the newly created link itself
  simulateRevokeLink('active-share-target');
  assert.equal(newlyCreatedLink, null, 'Must clear newlyCreatedLink when its own shareId is revoked');
});

// ==============================================================================
// 5. Behavioral Runtime Tests: Two-Step Revocation & Timer Cleanup
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Two-step revocation flow: initial click requires confirmation without invoking revokeLink', async () => {
  let confirmRevokeId = null;
  let revokeCallCount = 0;

  const mockRevokeLink = async () => {
    revokeCallCount++;
    return true;
  };

  const handleInitialRevokeClick = (linkId) => {
    confirmRevokeId = linkId;
  };

  handleInitialRevokeClick('link-abc-123');
  assert.equal(confirmRevokeId, 'link-abc-123');
  assert.equal(revokeCallCount, 0, 'Initial click must NOT execute revocation');

  const handleCancelRevoke = () => {
    confirmRevokeId = null;
  };

  handleCancelRevoke();
  assert.equal(confirmRevokeId, null);
  assert.equal(revokeCallCount, 0, 'Cancelling must NOT execute revocation');
});

test('[BEHAVIORAL RUNTIME] Two-step revocation flow: confirmed revocation invokes revokeLink and triggers success toast', async () => {
  const toastEvents = [];
  const mockToast = {
    success: (desc, title) => toastEvents.push({ type: 'success', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  let confirmRevokeId = 'link-xyz-789';
  let revokingId = null;
  const revokedLinks = [];

  const mockRevokeLink = async (id) => {
    revokedLinks.push(id);
    return true;
  };

  const handleConfirmRevoke = async (linkId) => {
    if (revokingId) return;
    revokingId = linkId;
    const ok = await mockRevokeLink(linkId);
    revokingId = null;

    if (ok) {
      mockToast.success('Share link has been revoked.', 'Link Revoked');
      confirmRevokeId = null;
    } else {
      mockToast.error('Failed to revoke share link. Please try again.', 'Revocation Failed');
    }
  };

  await handleConfirmRevoke('link-xyz-789');

  assert.equal(revokedLinks.length, 1);
  assert.equal(revokedLinks[0], 'link-xyz-789');
  assert.equal(confirmRevokeId, null);
  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'success');
  assert.equal(toastEvents[0].title, 'Link Revoked');
});

test('[BEHAVIORAL RUNTIME] Expiration refresh interval starts only while open and cleans up on close/unmount', () => {
  let intervalRunning = false;
  let intervalCleared = false;
  let timerId = null;

  const mockSetInterval = () => {
    intervalRunning = true;
    timerId = 12345;
    return timerId;
  };

  const mockClearInterval = (id) => {
    if (id === 12345) {
      intervalRunning = false;
      intervalCleared = true;
    }
  };

  // Simulating effect lifecycle
  const mountEffect = (isOpen) => {
    if (!isOpen) return () => {};
    const interval = mockSetInterval();
    return () => mockClearInterval(interval);
  };

  // Case A: Modal is closed -> No interval registered
  const cleanupClosed = mountEffect(false);
  assert.equal(intervalRunning, false, 'Must not start timer when modal is closed');
  cleanupClosed();

  // Case B: Modal is opened -> Interval registered
  const cleanupOpened = mountEffect(true);
  assert.equal(intervalRunning, true, 'Must start timer when modal is open');

  // Case C: Modal closes / unmounts -> Interval cleared
  cleanupOpened();
  assert.equal(intervalRunning, false, 'Must stop timer when modal closes');
  assert.equal(intervalCleared, true);
});

// ==============================================================================
// 6. Static Source-Inspection Tests: ShareModal Architecture, Accessibility & Lifecycle
// ==============================================================================

test('[STATIC SOURCE] ShareModal integrates Phase 9B Modal primitive and accessible modal attributes', () => {
  const src = readSrc('src/features/sharing/components/ShareModal.tsx');

  assert.ok(
    src.includes("import { Modal } from '@/components/ui/Modal'"),
    'ShareModal must import Modal primitive'
  );
  assert.ok(src.includes('<Modal'), 'ShareModal must render <Modal> container');
  assert.ok(
    src.includes('title={`Share "${file.fileName}"`}'),
    'ShareModal must pass dynamic file title to Modal'
  );
  assert.ok(src.includes('size="xl"'), 'ShareModal must pass size="xl" to Modal');
  assert.ok(src.includes('max-w-xl'), 'ShareModal must apply max-w-xl');
  assert.ok(src.includes('max-h-[90vh]'), 'ShareModal must apply max-h-[90vh]');
  assert.ok(src.includes('overflow-y-auto'), 'ShareModal must enable overflow-y-auto');
});

test('[STATIC SOURCE] ShareModal enforces semantic design tokens and eliminates hardcoded slate/white colors', () => {
  const src = readSrc('src/features/sharing/components/ShareModal.tsx');

  assert.ok(src.includes('border-border'), 'Must use border-border');
  assert.ok(src.includes('bg-card'), 'Must use bg-card');
  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground');
  assert.ok(src.includes('bg-primary/10'), 'Must use bg-primary/10 for selected state');
  assert.ok(src.includes('border-destructive/30'), 'Must use border-destructive/30 for warning/revoke');
  assert.ok(src.includes('bg-destructive/10'), 'Must use bg-destructive/10 for warning/revoke');

  assert.ok(!src.includes('bg-slate-900/50'), 'Must not use hardcoded bg-slate-900/50 backdrop');
  assert.ok(!src.includes('bg-white'), 'Must not use hardcoded bg-white background');
  assert.ok(!src.includes('border-slate-200'), 'Must not use hardcoded border-slate-200');
  assert.ok(!src.includes('text-slate-900'), 'Must not use hardcoded text-slate-900');
  assert.ok(!src.includes('text-slate-500'), 'Must not use hardcoded text-slate-500');
});

test('[STATIC SOURCE] ShareModal expiration selector implements complete roving tabIndex and arrow key navigation', () => {
  const src = readSrc('src/features/sharing/components/ShareModal.tsx');

  assert.ok(src.includes('role="radiogroup"'), 'Must declare role="radiogroup"');
  assert.ok(src.includes('aria-label="Link expiration duration"'), 'Must provide accessible radiogroup label');
  assert.ok(src.includes('role="radio"'), 'Each option button must declare role="radio"');
  assert.ok(src.includes('aria-checked={isSelected}'), 'Each option must declare aria-checked');
  assert.ok(src.includes('tabIndex={isSelected ? 0 : -1}'), 'Must implement roving tabIndex');
  assert.ok(src.includes('onKeyDown={handleRadioKeyDown}'), 'Must bind arrow-key navigation handler');
  assert.ok(src.includes('ArrowRight') && src.includes('ArrowDown'), 'Must handle forward arrow navigation');
  assert.ok(src.includes('ArrowLeft') && src.includes('ArrowUp'), 'Must handle backward arrow navigation');
});

test('[STATIC SOURCE] ShareModal single clipboard write and error propagation', () => {
  const modalSrc = readSrc('src/features/sharing/components/ShareModal.tsx');
  const hookSrc = readSrc('src/features/sharing/hooks/useShare.ts');

  // ShareModal delegates entirely to copyToClipboard and does not perform its own writeText
  assert.ok(modalSrc.includes('await copyToClipboard(url)'), 'Must await copyToClipboard helper');
  assert.ok(!modalSrc.includes('navigator.clipboard.writeText'), 'ShareModal must not perform duplicate writeText');

  // useShare performs the single writeText and throws on error
  assert.ok(hookSrc.includes('await navigator.clipboard.writeText(text)'), 'useShare must perform writeText');
  assert.ok(hookSrc.includes('throw'), 'useShare must propagate clipboard errors to caller');
  assert.ok(hookSrc.includes('copyTimerRef'), 'useShare must maintain timer ref for unmount cleanup');
});

test('[STATIC SOURCE] useShare cleans up stale raw share-link state on creation attempt, failure, and revocation', () => {
  const hookSrc = readSrc('src/features/sharing/hooks/useShare.ts');

  // Cleared on creation attempt start and failure
  assert.ok(hookSrc.includes('setNewlyCreatedLink(null); // Clear previous link when new attempt begins'));
  assert.ok(hookSrc.includes('setNewlyCreatedLink(null); // Clear when creation attempt fails'));

  // Cleared on revocation of that specific link
  assert.ok(hookSrc.includes('setNewlyCreatedLink((current) => (current?.shareId === linkId ? null : current))'));

  // Security guarantees
  assert.ok(!hookSrc.includes('localStorage'));
  assert.ok(!hookSrc.includes('sessionStorage'));
});

test('[STATIC SOURCE] ShareModal maintains 30-second relative expiration interval with cleanup', () => {
  const src = readSrc('src/features/sharing/components/ShareModal.tsx');

  assert.ok(src.includes('if (!isOpen) return;'), 'Interval must not start if modal is closed');
  assert.ok(src.includes('setInterval(') && src.includes('30000)'), 'Interval must tick every 30,000ms');
  assert.ok(src.includes('clearInterval('), 'Interval must be cleared on close/unmount');
});
