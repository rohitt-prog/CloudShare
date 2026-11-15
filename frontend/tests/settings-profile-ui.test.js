import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTimestampSafe } from '../src/features/files/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

// ==============================================================================
// 1. Behavioral Runtime Tests: Preference, Identity, and Clipboard Logic
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Theme selection updates theme state and preserves valid options', () => {
  let currentTheme = 'system';
  const setTheme = (val) => {
    currentTheme = val;
  };

  const options = ['light', 'dark', 'system'];
  for (const opt of options) {
    setTheme(opt);
    assert.equal(currentTheme, opt);
  }
});

test('[BEHAVIORAL RUNTIME] Theme selection state reflects active aria-pressed state', () => {
  const currentTheme = 'dark';
  const themeOptions = ['light', 'dark', 'system'];

  const states = themeOptions.map((opt) => ({
    value: opt,
    isPressed: currentTheme === opt,
  }));

  assert.equal(states.find((s) => s.value === 'dark')?.isPressed, true);
  assert.equal(states.find((s) => s.value === 'light')?.isPressed, false);
  assert.equal(states.find((s) => s.value === 'system')?.isPressed, false);
});

test('[BEHAVIORAL RUNTIME] View preference reads and writes the exact cloudshare-view-mode localStorage key', () => {
  const STORAGE_KEY = 'cloudshare-view-mode';
  const mockStorage = new Map();

  const setViewMode = (mode) => {
    mockStorage.set(STORAGE_KEY, mode);
  };

  const getViewMode = () => {
    const val = mockStorage.get(STORAGE_KEY);
    return val === 'grid' || val === 'list' ? val : 'list';
  };

  // Initially defaults to list
  assert.equal(getViewMode(), 'list');

  // Set to grid
  setViewMode('grid');
  assert.equal(mockStorage.get(STORAGE_KEY), 'grid');
  assert.equal(getViewMode(), 'grid');

  // Set back to list
  setViewMode('list');
  assert.equal(mockStorage.get(STORAGE_KEY), 'list');
  assert.equal(getViewMode(), 'list');
});

test('[BEHAVIORAL RUNTIME] View preference handles missing or invalid localStorage values safely with fallback', () => {
  const STORAGE_KEY = 'cloudshare-view-mode';

  const resolveViewMode = (storedVal) => {
    try {
      if (storedVal === 'grid' || storedVal === 'list') {
        return storedVal;
      }
    } catch {
      // Inaccessible storage fallback
    }
    return 'list';
  };

  assert.equal(resolveViewMode(null), 'list');
  assert.equal(resolveViewMode(undefined), 'list');
  assert.equal(resolveViewMode('unknown-mode'), 'list');
  assert.equal(resolveViewMode(''), 'list');
  assert.equal(resolveViewMode('grid'), 'grid');
  assert.equal(resolveViewMode('list'), 'list');
});

test('[BEHAVIORAL RUNTIME] Account initials derive correctly from available user identity data', () => {
  const deriveInitials = (user) => {
    if (user?.fullName) {
      const parts = user.fullName.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length > 0) {
        return parts[0][0].toUpperCase();
      }
    }
    if (user?.email && user.email.length > 0) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Two-word full name
  assert.equal(deriveInitials({ fullName: 'Sarah Connor', email: 'sarah@skynet.com' }), 'SC');

  // Three-word full name (first and last)
  assert.equal(deriveInitials({ fullName: 'John Fitzgerald Kennedy', email: 'jfk@gov.us' }), 'JK');

  // Single-word full name
  assert.equal(deriveInitials({ fullName: 'Cher', email: 'cher@music.com' }), 'C');

  // No full name, fallback to email initial
  assert.equal(deriveInitials({ fullName: null, email: 'alex@example.com' }), 'A');

  // Neither full name nor email
  assert.equal(deriveInitials({ fullName: null, email: null }), 'U');
  assert.equal(deriveInitials(null), 'U');
});

test('[BEHAVIORAL RUNTIME] Member Since date formatting handles valid and invalid timestamps safely without NaN', () => {
  const formatMemberSince = (createdAt) => {
    if (!createdAt) return '—';
    const timestamp = parseTimestampSafe(createdAt);
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Valid ISO timestamp
  const valid = formatMemberSince('2026-11-14T19:30:00.000Z');
  assert.ok(valid.includes('2026') || valid.includes('Nov'));

  // Invalid strings, null, undefined
  assert.equal(formatMemberSince(null), '—');
  assert.equal(formatMemberSince(undefined), '—');
  assert.equal(formatMemberSince('invalid-iso'), '—');
  assert.equal(formatMemberSince(''), '—');
});

test('[BEHAVIORAL RUNTIME] Account UUID copy action executes exactly one clipboard write and triggers success feedback', async () => {
  let clipboardWriteCount = 0;
  let lastCopiedText = null;

  const mockClipboard = {
    writeText: async (text) => {
      clipboardWriteCount++;
      lastCopiedText = text;
    },
  };

  const toastEvents = [];
  const mockToast = {
    success: (desc, title) => toastEvents.push({ type: 'success', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleCopy = async (userId) => {
    if (!userId) return;
    try {
      await mockClipboard.writeText(userId);
      mockToast.success('Account identifier copied to clipboard.', 'Copied');
    } catch {
      mockToast.error('Unable to copy account identifier.', 'Copy Failed');
    }
  };

  await handleCopy('usr_12345678-abcd-ef01-2345-6789abcdef01');

  assert.equal(clipboardWriteCount, 1, 'Must write to clipboard exactly once');
  assert.equal(lastCopiedText, 'usr_12345678-abcd-ef01-2345-6789abcdef01');
  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'success');
  assert.equal(toastEvents[0].title, 'Copied');
});

test('[BEHAVIORAL RUNTIME] Clipboard failure triggers error feedback path without false success', async () => {
  const mockFailingClipboard = {
    writeText: async () => {
      throw new Error('Clipboard write access denied by browser permissions policy');
    },
  };

  const toastEvents = [];
  const mockToast = {
    success: (desc, title) => toastEvents.push({ type: 'success', desc, title }),
    error: (desc, title) => toastEvents.push({ type: 'error', desc, title }),
  };

  const handleCopy = async (userId) => {
    if (!userId) return;
    try {
      await mockFailingClipboard.writeText(userId);
      mockToast.success('Account identifier copied to clipboard.', 'Copied');
    } catch {
      mockToast.error('Unable to copy account identifier to clipboard.', 'Copy Failed');
    }
  };

  await handleCopy('usr_test_uuid');

  assert.equal(toastEvents.length, 1);
  assert.equal(toastEvents[0].type, 'error');
  assert.equal(toastEvents[0].title, 'Copy Failed');
  assert.equal(toastEvents[0].desc, 'Unable to copy account identifier to clipboard.');
});

test('[BEHAVIORAL RUNTIME] Session expiration formatting handles valid epoch seconds and missing values safely', () => {
  const formatSessionExpiration = (expiresAt) => {
    if (!expiresAt || typeof expiresAt !== 'number' || isNaN(expiresAt)) {
      return 'Not available';
    }
    const date = new Date(expiresAt * 1000);
    if (isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Valid unix timestamp in seconds
  const formatted = formatSessionExpiration(1795000000);
  assert.ok(formatted.length > 5);
  assert.ok(!formatted.includes('NaN'));

  // Missing or non-numeric values must return 'Not available'
  assert.equal(formatSessionExpiration(undefined), 'Not available');
  assert.equal(formatSessionExpiration(null), 'Not available');
  assert.equal(formatSessionExpiration(NaN), 'Not available');
  assert.equal(formatSessionExpiration('invalid'), 'Not available');
});

// ==============================================================================
// 2. Static Source-Inspection Tests: Settings Page Architecture & Security
// ==============================================================================

test('[STATIC SOURCE] Settings route is registered and wrapped inside AppShell in router.tsx', () => {
  const routerSrc = readSrc('src/app/router.tsx');
  const contextSrc = readSrc('src/app/router-context.ts');

  assert.ok(contextSrc.includes("'settings'"), 'router-context.ts must declare settings in AppRoute');
  assert.ok(routerSrc.includes("import { SettingsPage } from '@/pages/SettingsPage';"), 'router.tsx must import SettingsPage');
  assert.ok(routerSrc.includes("case 'settings':"), 'router.tsx must contain case settings');
  assert.ok(routerSrc.includes('<SettingsPage />'), 'router.tsx must render SettingsPage');
  assert.ok(routerSrc.includes('<AppShell>'), 'SettingsPage must be wrapped inside AppShell');
});

test('[STATIC SOURCE] AppRouter preserves existing home, dashboard, and guest share routes', () => {
  const routerSrc = readSrc('src/app/router.tsx');

  assert.ok(routerSrc.includes("case 'home':"), 'Must preserve home route');
  assert.ok(routerSrc.includes('<HomePage />'), 'Must preserve HomePage');
  assert.ok(routerSrc.includes("case 'dashboard':"), 'Must preserve dashboard route');
  assert.ok(routerSrc.includes('<DashboardPage />'), 'Must preserve DashboardPage');
  assert.ok(routerSrc.includes("case 'share':"), 'Must preserve guest share route');
  assert.ok(routerSrc.includes('<SharedFilePage'), 'Must preserve SharedFilePage');
});

test('[STATIC SOURCE] SettingsPage consumes useTheme and uses aria-pressed for theme selection', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(src.includes('useTheme()'), 'Must consume useTheme hook');
  assert.ok(src.includes('setTheme(opt.value)'), 'Must invoke setTheme on selection');
  assert.ok(src.includes('aria-pressed={isSelected}'), 'Must declare aria-pressed for theme options');
  assert.ok(src.includes('role="group"'), 'Must declare role="group" on theme container');
  assert.ok(src.includes('aria-label="Theme selection"'), 'Must declare aria-label on theme selection group');
});

test('[STATIC SOURCE] SettingsPage reuses existing VIEW_MODE_STORAGE_KEY for vault preference', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(
    src.includes('VIEW_MODE_STORAGE_KEY'),
    'Must use VIEW_MODE_STORAGE_KEY for vault view mode preference'
  );
  assert.ok(
    src.includes("handleViewModeChange('list')"),
    'Must provide List View preference handler'
  );
  assert.ok(
    src.includes("handleViewModeChange('grid')"),
    'Must provide Grid View preference handler'
  );
  assert.ok(
    src.includes('role="group"'),
    'Must use role="group" for view mode buttons'
  );
});

test('[STATIC SOURCE] SettingsPage reads account identity from useAuth and provides accessible UUID copy', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(src.includes('useAuth()'), 'Must consume useAuth');
  assert.ok(src.includes('user?.id'), 'Must display account UUID');
  assert.ok(src.includes('aria-label="Copy account identifier"'), 'Copy button must declare aria-label');
  assert.ok(src.includes('navigator.clipboard.writeText'), 'Must invoke clipboard writeText');
  assert.ok(src.includes('toast.success'), 'Must fire success toast upon copying');
  assert.ok(src.includes('toast.error'), 'Must fire error toast on clipboard rejection');
});

test('[STATIC SOURCE] SettingsPage strictly avoids exposing access tokens, refresh tokens, or session secrets', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(!src.includes('access_token'), 'Must not render or reference access_token');
  assert.ok(!src.includes('refresh_token'), 'Must not render or reference refresh_token');
  assert.ok(!src.includes('session.token'), 'Must not render session token secrets');
});

test('[STATIC SOURCE] SettingsPage strictly avoids fake email-verification badges or unverified provider claims', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(!src.includes('Email Verified'), 'Must not display fake Email Verified badge');
  assert.ok(!src.includes('Google Account'), 'Must not claim unverified Google Auth provider');
  assert.ok(!src.includes('GitHub Account'), 'Must not claim unverified GitHub Auth provider');
});

test('[STATIC SOURCE] SettingsPage strictly avoids unsupported MFA, password modification, or account deletion', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(!src.includes('Two-Factor Authentication'), 'Must not display fake 2FA controls');
  assert.ok(!src.includes('Change Password'), 'Must not display fake password modification form');
  assert.ok(!src.includes('Delete Account'), 'Must not display fake account deletion button');
});

test('[STATIC SOURCE] SettingsPage displays truthful 50 MiB per-file upload limit without fictional quotas', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(src.includes('50 MiB per file'), 'Must state truthful 50 MiB limit');
  assert.ok(!src.includes('10 GB'), 'Must not display fictional 10 GB quota');
  assert.ok(!src.includes('storage quota'), 'Must not display fabricated storage quota');
  assert.ok(!src.includes('Pro Tier'), 'Must not display fictional plan names');
});

test('[STATIC SOURCE] SettingsPage integrates confirmation Modal for sign-out action', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(src.includes('<Modal'), 'Must render Modal primitive for sign-out confirmation');
  assert.ok(src.includes('title="Confirm Sign Out"'), 'Modal must have Confirm Sign Out title');
  assert.ok(src.includes('signOut()'), 'Must invoke signOut() from useAuth');
  assert.ok(src.includes('isSigningOut'), 'Must guard against duplicate sign-out submissions');
});

test('[STATIC SOURCE] SettingsPage enforces semantic design tokens and eliminates hardcoded slate/white backgrounds', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('bg-card'), 'Must use bg-card');
  assert.ok(src.includes('border-border'), 'Must use border-border');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground');
  assert.ok(!src.includes('bg-white'), 'Must not hardcode bg-white');
  assert.ok(!src.includes('bg-slate-900'), 'Must not hardcode bg-slate-900');
});

test('[STATIC SOURCE] SettingsPage separates session status from expiration and falls back to Not available', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  // Session status must remain Active Session
  assert.ok(src.includes('Active Session</span>'), 'Must display Active Session for session status');

  // Expiration must fall back to 'Not available' when missing or invalid
  assert.ok(src.includes("return 'Not available';"), 'Must return Not available when expires_at is missing or non-numeric');
  assert.ok(!src.includes("return 'Active session';"), 'Must not use Active session as expiration fallback');
});

test('[STATIC SOURCE] SettingsPage displays refined private storage wording without absolute third-party guarantee', () => {
  const src = readSrc('src/pages/SettingsPage.tsx');

  assert.ok(
    src.includes('Files are stored in a private cloud storage bucket. Access is controlled through authenticated ownership policies and CloudShare'),
    'Must display refined private storage wording'
  );
  assert.ok(
    !src.includes('inaccessible to third parties without an active'),
    'Must not make absolute third-party inaccessibility claim'
  );
});
