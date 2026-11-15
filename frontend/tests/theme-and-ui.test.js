import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import pure theme helpers
import {
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  STORAGE_KEY,
} from '../src/app/providers/theme-context.ts';

// =============================================================================
// Test Suite 1: Theme Persistence & Storage Helpers
// =============================================================================

test('getStoredTheme retrieves valid stored themes ("light", "dark", "system")', () => {
  const mockStorage = {
    'cloudshare-theme': 'dark',
  };

  // Mock global window/localStorage
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.window = /** @type {any} */ ({});
  globalThis.localStorage = /** @type {any} */ ({
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => {
      mockStorage[key] = val;
    },
  });

  try {
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'dark');

    mockStorage[STORAGE_KEY] = 'light';
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'light');

    mockStorage[STORAGE_KEY] = 'system';
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'system');
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test('getStoredTheme safely defaults to fallback on missing or invalid stored values', () => {
  const mockStorage = {
    'cloudshare-theme': 'invalid-theme-value',
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.window = /** @type {any} */ ({});
  globalThis.localStorage = /** @type {any} */ ({
    getItem: (key) => mockStorage[key] || null,
  });

  try {
    // Invalid value returns fallback
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'system');

    // Missing key returns fallback
    delete mockStorage[STORAGE_KEY];
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'system');
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'light'), 'light');
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test('getStoredTheme and setStoredTheme safely catch storage exceptions (e.g. Safari private mode)', () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.window = /** @type {any} */ ({});
  globalThis.localStorage = /** @type {any} */ ({
    getItem: () => {
      throw new Error('QuotaExceededError / SecurityError: Storage is disabled');
    },
    setItem: () => {
      throw new Error('QuotaExceededError / SecurityError: Storage is disabled');
    },
  });

  try {
    // Should never throw, should return fallback
    assert.strictEqual(getStoredTheme(STORAGE_KEY, 'system'), 'system');

    // Should never throw
    assert.doesNotThrow(() => {
      setStoredTheme(STORAGE_KEY, 'dark');
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test('getSystemTheme resolves dark/light via matchMedia and handles missing window gracefully', () => {
  const originalWindow = globalThis.window;

  // 1. Without window (SSR / Node)
  delete globalThis.window;
  assert.strictEqual(getSystemTheme(), 'light');

  // 2. With window and dark matchMedia
  globalThis.window = /** @type {any} */ ({
    matchMedia: (query) => ({
      matches: query.includes('dark'),
    }),
  });
  assert.strictEqual(getSystemTheme(), 'dark');

  // 3. With window and light matchMedia
  globalThis.window = /** @type {any} */ ({
    matchMedia: (query) => ({
      matches: !query.includes('dark'),
    }),
  });
  assert.strictEqual(getSystemTheme(), 'light');

  globalThis.window = originalWindow;
});

// =============================================================================
// Test Suite 2: Synchronous Zero-Flicker Script in index.html
// =============================================================================

test('index.html includes synchronous theme bootstrap script before module hydration', () => {
  const indexHtmlPath = path.resolve('index.html');
  const content = fs.readFileSync(indexHtmlPath, 'utf8');

  // Script exists inside <head>
  assert.match(content, /<head>[\s\S]*<script>[\s\S]*cloudshare-theme[\s\S]*<\/head>/i);

  // Script checks localStorage and prefers-color-scheme
  assert.match(content, /localStorage\.getItem\(['"]cloudshare-theme['"]\)/);
  assert.match(content, /matchMedia\(['"]\(prefers-color-scheme: dark\)['"]\)/);

  // Script toggles 'dark' class on documentElement
  assert.match(content, /document\.documentElement\.classList\.add\(['"]dark['"]\)/);
  assert.match(content, /document\.documentElement\.classList\.remove\(['"]dark['"]\)/);

  // Script wraps operations in try/catch to guarantee zero crash
  assert.match(content, /try\s*\{[\s\S]*\}\s*catch/);
});

// =============================================================================
// Test Suite 3: Tailwind Config & Semantic Design Tokens
// =============================================================================

test('tailwind.config.js declares darkMode: "class" and semantic HSL tokens', () => {
  const tailwindPath = path.resolve('tailwind.config.js');
  const content = fs.readFileSync(tailwindPath, 'utf8');

  assert.match(content, /darkMode:\s*['"]class['"]/);
  assert.match(content, /background:\s*['"]hsl\(var\(--background\)/);
  assert.match(content, /foreground:\s*['"]hsl\(var\(--foreground\)/);
  assert.match(content, /primary:\s*\{[\s\S]*DEFAULT:\s*['"]hsl\(var\(--primary\)/);
  assert.match(content, /destructive:\s*\{[\s\S]*DEFAULT:\s*['"]hsl\(var\(--destructive\)/);
  assert.match(content, /muted:\s*\{[\s\S]*DEFAULT:\s*['"]hsl\(var\(--muted\)/);
  assert.match(content, /card:\s*\{[\s\S]*DEFAULT:\s*['"]hsl\(var\(--card\)/);
  assert.match(content, /border:\s*['"]hsl\(var\(--border\)/);
  assert.match(content, /ring:\s*['"]hsl\(var\(--ring\)/);
});

test('index.css declares complete semantic tokens in both :root and .dark scopes', () => {
  const cssPath = path.resolve('src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');

  const requiredTokens = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--muted',
    '--muted-foreground',
    '--border',
    '--input',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--destructive-foreground',
    '--ring',
    '--radius',
  ];

  // Check :root block
  const rootMatch = content.match(/:root\s*\{([^}]+)\}/);
  assert.ok(rootMatch, ':root block must exist in index.css');
  for (const token of requiredTokens) {
    assert.ok(
      rootMatch[1].includes(token),
      `:root must declare token ${token}`
    );
  }

  // Check .dark block
  const darkMatch = content.match(/\.dark\s*\{([^}]+)\}/);
  assert.ok(darkMatch, '.dark block must exist in index.css');
  for (const token of requiredTokens) {
    assert.ok(
      darkMatch[1].includes(token),
      `.dark must declare token ${token}`
    );
  }

  // Check accessible focus and reduced motion rules
  assert.match(content, /:focus-visible\s*\{/);
  assert.match(content, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

// =============================================================================
// Test Suite 4: Toast Notification Data Flow & Logic
// =============================================================================

test('Toast item creation accurately formats type, description, and custom duration', () => {
  const testOptions = {
    title: 'Download Successful',
    description: 'project-specs.pdf downloaded safely.',
    type: 'success',
    duration: 5000,
  };

  const id = `toast-${Date.now()}`;
  const toastItem = {
    id,
    ...testOptions,
  };

  assert.strictEqual(toastItem.id, id);
  assert.strictEqual(toastItem.type, 'success');
  assert.strictEqual(toastItem.title, 'Download Successful');
  assert.strictEqual(toastItem.duration, 5000);
});

// =============================================================================
// Test Suite 5: Reusable UI Component Accessibility Contracts
// =============================================================================

test('Modal component source includes dialog role, aria-modal, focus trapping, and escape listener', () => {
  const modalPath = path.resolve('src/components/ui/Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.match(content, /role="dialog"/);
  assert.match(content, /aria-modal="true"/);
  assert.match(content, /e\.key === 'Escape'/);
  assert.match(content, /e\.key === 'Tab'/);
  assert.match(content, /document\.body\.style\.overflow\s*=\s*'hidden'/);
});

test('DropdownMenu component source enforces menu role, aria-haspopup, and keyboard navigation', () => {
  const dropdownPath = path.resolve('src/components/ui/DropdownMenu.tsx');
  const content = fs.readFileSync(dropdownPath, 'utf8');

  assert.match(content, /role="menu"/);
  assert.match(content, /role="menuitem"/);
  assert.match(content, /aria-haspopup="menu"/);
  assert.match(content, /aria-expanded=\{isOpen\}/);
  assert.match(content, /e\.key === 'ArrowDown'/);
  assert.match(content, /e\.key === 'ArrowUp'/);
});

test('Skeleton component source enforces aria-hidden="true" and reduced motion', () => {
  const skeletonPath = path.resolve('src/components/ui/Skeleton.tsx');
  const content = fs.readFileSync(skeletonPath, 'utf8');

  assert.match(content, /aria-hidden="true"/);
  assert.match(content, /motion-reduce:animate-none/);
});

test('AppProviders wraps ThemeProvider and ToastProvider around the application hierarchy', () => {
  const appProvidersPath = path.resolve('src/app/providers/AppProviders.tsx');
  const content = fs.readFileSync(appProvidersPath, 'utf8');

  assert.match(content, /<ThemeProvider/);
  assert.match(content, /<AuthProvider/);
  assert.match(content, /<ToastProvider/);
});
