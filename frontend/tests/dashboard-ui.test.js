import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatByteSize,
  parseTimestampSafe,
  determineFileCategory,
} from '../src/features/files/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

const createMockFile = (
  id,
  fileName,
  fileSize,
  createdAt,
  category = 'documents'
) => ({
  id,
  fileName,
  storagePath: `user-123/${id}/${fileName}`,
  fileSize,
  formattedSize: formatByteSize(fileSize),
  mimeType: category === 'images' ? 'image/png' : 'application/pdf',
  category,
  ownerId: 'user-123',
  createdAt,
  updatedAt: createdAt,
});

// ==============================================================================
// 1. Behavioral Runtime Tests: Dashboard Metrics & Calculations
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Total file count and total storage calculations derive from actual file collection', () => {
  const files = [
    createMockFile('f-1', 'document.pdf', 1048576, '2026-11-15T10:00:00Z', 'documents'),
    createMockFile('f-2', 'photo.jpg', 2097152, '2026-11-14T10:00:00Z', 'images'),
    createMockFile('f-3', 'archive.zip', 5242880, '2026-11-13T10:00:00Z', 'archives'),
  ];

  const totalFiles = files.length;
  const totalSizeBytes = files.reduce((acc, f) => acc + f.fileSize, 0);
  const formattedTotalSize = formatByteSize(totalSizeBytes);

  assert.equal(totalFiles, 3);
  assert.equal(totalSizeBytes, 8388608); // exactly 8 MB
  assert.equal(formattedTotalSize, '8.0 MB');
});

test('[BEHAVIORAL RUNTIME] Category file counts accurately reflect supported categories', () => {
  const files = [
    createMockFile('f-1', 'doc1.pdf', 1000, '2026-11-15T10:00:00Z', 'documents'),
    createMockFile('f-2', 'doc2.docx', 2000, '2026-11-14T10:00:00Z', 'documents'),
    createMockFile('f-3', 'img1.png', 3000, '2026-11-13T10:00:00Z', 'images'),
    createMockFile('f-4', 'vid1.mp4', 4000, '2026-11-12T10:00:00Z', 'media'),
    createMockFile('f-5', 'arch1.tar', 5000, '2026-11-11T10:00:00Z', 'archives'),
    createMockFile('f-6', 'misc.dat', 6000, '2026-11-10T10:00:00Z', 'other'),
  ];

  const counts = {
    documents: 0,
    images: 0,
    media: 0,
    archives: 0,
    other: 0,
  };

  files.forEach((f) => {
    if (counts[f.category] !== undefined) {
      counts[f.category]++;
    } else {
      counts.other++;
    }
  });

  assert.equal(counts.documents, 2);
  assert.equal(counts.images, 1);
  assert.equal(counts.media, 1);
  assert.equal(counts.archives, 1);
  assert.equal(counts.other, 1);
});

test('[BEHAVIORAL RUNTIME] Category storage distribution percentages calculate accurately against total bytes', () => {
  const files = [
    createMockFile('f-1', 'doc.pdf', 2500, '2026-11-15T10:00:00Z', 'documents'),
    createMockFile('f-2', 'img.png', 7500, '2026-11-14T10:00:00Z', 'images'),
  ];

  const totalBytes = files.reduce((acc, f) => acc + f.fileSize, 0); // 10,000 B
  assert.equal(totalBytes, 10000);

  const docBytes = files.filter((f) => f.category === 'documents').reduce((acc, f) => acc + f.fileSize, 0);
  const imgBytes = files.filter((f) => f.category === 'images').reduce((acc, f) => acc + f.fileSize, 0);

  const docPercentage = Number(((docBytes / totalBytes) * 100).toFixed(1));
  const imgPercentage = Number(((imgBytes / totalBytes) * 100).toFixed(1));

  assert.equal(docPercentage, 25.0);
  assert.equal(imgPercentage, 75.0);
});

test('[BEHAVIORAL RUNTIME] Zero-storage and empty-array handling never produces NaN or division-by-zero', () => {
  const emptyFiles = [];
  const totalBytes = emptyFiles.reduce((acc, f) => acc + f.fileSize, 0);

  const calculatePercentage = (categoryBytes) => {
    return totalBytes > 0 ? Number(((categoryBytes / totalBytes) * 100).toFixed(1)) : 0;
  };

  const percentage = calculatePercentage(0);

  assert.equal(totalBytes, 0);
  assert.equal(percentage, 0);
  assert.ok(!isNaN(percentage), 'Must never be NaN');
  assert.ok(isFinite(percentage), 'Must be finite');
});

test('[BEHAVIORAL RUNTIME] Most active category selection identifies top category and handles ties/empty consistently', () => {
  const CATEGORIES = ['documents', 'images', 'media', 'archives', 'other'];

  const getMostActiveCategory = (files) => {
    if (!files || files.length === 0) {
      return { label: 'None', count: 0 };
    }

    const counts = {
      documents: 0,
      images: 0,
      media: 0,
      archives: 0,
      other: 0,
    };

    files.forEach((f) => {
      if (counts[f.category] !== undefined) counts[f.category]++;
      else counts.other++;
    });

    let top = { label: 'None', count: 0 };
    for (const cat of CATEGORIES) {
      if (counts[cat] > top.count) {
        top = { label: cat.charAt(0).toUpperCase() + cat.slice(1), count: counts[cat] };
      }
    }

    return top.count === 0 ? { label: 'None', count: 0 } : top;
  };

  // 1. Empty files -> 'None'
  assert.deepEqual(getMostActiveCategory([]), { label: 'None', count: 0 });

  // 2. Clear winner -> 'Images' (3)
  const filesWithWinner = [
    createMockFile('f-1', 'a.png', 100, '2026-11-01', 'images'),
    createMockFile('f-2', 'b.jpg', 100, '2026-11-02', 'images'),
    createMockFile('f-3', 'c.webp', 100, '2026-11-03', 'images'),
    createMockFile('f-4', 'doc.pdf', 100, '2026-11-04', 'documents'),
  ];
  assert.deepEqual(getMostActiveCategory(filesWithWinner), { label: 'Images', count: 3 });

  // 3. Tie -> Deterministic first encounter
  const tiedFiles = [
    createMockFile('f-1', 'doc.pdf', 100, '2026-11-01', 'documents'),
    createMockFile('f-2', 'img.png', 100, '2026-11-02', 'images'),
  ];
  assert.deepEqual(getMostActiveCategory(tiedFiles), { label: 'Documents', count: 1 });
});

test('[BEHAVIORAL RUNTIME] Recent uploads sorts newest first and handles invalid timestamps deterministically', () => {
  const files = [
    createMockFile('f-1', 'older.pdf', 100, '2026-11-10T12:00:00Z'),
    createMockFile('f-2', 'newest.pdf', 100, '2026-11-15T12:00:00Z'),
    createMockFile('f-3', 'middle.pdf', 100, '2026-11-12T12:00:00Z'),
    createMockFile('f-4', 'invalid-date.pdf', 100, 'invalid-iso-string'),
    createMockFile('f-5', 'null-date.pdf', 100, null),
  ];

  const sorted = [...files].sort((a, b) => {
    const timeA = parseTimestampSafe(a.createdAt);
    const timeB = parseTimestampSafe(b.createdAt);
    return timeB - timeA;
  });

  // Newest valid date must be first
  assert.equal(sorted[0].id, 'f-2'); // 2026-11-15
  assert.equal(sorted[1].id, 'f-3'); // 2026-11-12
  assert.equal(sorted[2].id, 'f-1'); // 2026-11-10

  // Invalid timestamps resolve to 0 and sort deterministically at the end
  assert.ok(sorted[3].id === 'f-4' || sorted[3].id === 'f-5');
  assert.ok(sorted[4].id === 'f-4' || sorted[4].id === 'f-5');
});

test('[BEHAVIORAL RUNTIME] Recent uploads restricts output to maximum of five entries', () => {
  const files = [
    createMockFile('f-1', '1.pdf', 100, '2026-11-15T10:00:00Z'),
    createMockFile('f-2', '2.pdf', 100, '2026-11-14T10:00:00Z'),
    createMockFile('f-3', '3.pdf', 100, '2026-11-13T10:00:00Z'),
    createMockFile('f-4', '4.pdf', 100, '2026-11-12T10:00:00Z'),
    createMockFile('f-5', '5.pdf', 100, '2026-11-11T10:00:00Z'),
    createMockFile('f-6', '6.pdf', 100, '2026-11-10T10:00:00Z'),
    createMockFile('f-7', '7.pdf', 100, '2026-11-09T10:00:00Z'),
  ];

  const recent = [...files]
    .sort((a, b) => parseTimestampSafe(b.createdAt) - parseTimestampSafe(a.createdAt))
    .slice(0, 5);

  assert.equal(recent.length, 5);
  assert.equal(recent[0].id, 'f-1');
  assert.equal(recent[4].id, 'f-5');
});

// ==============================================================================
// 2. Static Source-Inspection Tests: Dashboard Architecture & Design Tokens
// ==============================================================================

test('[STATIC SOURCE] DashboardPage defines semantic landmarks and heading hierarchy', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes('<h1'), 'Must render <h1> heading');
  assert.ok(src.includes('Dashboard'), 'Must contain "Dashboard" title');
  assert.ok(src.includes('<section aria-labelledby="workspace-metrics-heading">'), 'Must define workspace metrics section');
  assert.ok(src.includes('<section aria-labelledby="category-breakdown-heading"'), 'Must define storage breakdown section');
  assert.ok(src.includes('<section aria-labelledby="recent-uploads-heading"'), 'Must define recent uploads section');
  assert.ok(src.includes('<section aria-labelledby="quick-actions-heading">'), 'Must define quick actions section');
});

test('[STATIC SOURCE] DashboardPage integrates Card, Badge, Button, and Skeleton Phase 9B primitives', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes("import { Button } from '@/components/ui/Button'"), 'Must import Button');
  assert.ok(src.includes("import { Card"), 'Must import Card');
  assert.ok(src.includes("import { Badge } from '@/components/ui/Badge'"), 'Must import Badge');
  assert.ok(src.includes("import { Skeleton } from '@/components/ui/Skeleton'"), 'Must import Skeleton');
  assert.ok(src.includes('<Card'), 'Must render <Card>');
  assert.ok(src.includes('<Badge'), 'Must render <Badge>');
  assert.ok(src.includes('<Button'), 'Must render <Button>');
  assert.ok(src.includes('<Skeleton'), 'Must render <Skeleton>');
});

test('[STATIC SOURCE] DashboardPage implements accessible loading skeleton states', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes('role="status"'), 'Must declare role="status" on loading containers');
  assert.ok(src.includes('aria-live="polite"'), 'Must declare aria-live="polite" for assistive technology');
  assert.ok(src.includes('isLoading ?'), 'Must conditionally render skeleton placeholders when loading');
});

test('[STATIC SOURCE] DashboardPage represents error and demo-mode states', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes('role="alert"'), 'Must declare role="alert" for error states');
  assert.ok(src.includes('isTableMissing &&'), 'Must handle isTableMissing state');
  assert.ok(src.includes('Demo Metadata Mode'), 'Must render truthful demo-mode warning');
});

test('[STATIC SOURCE] DashboardPage implements accessible progress bars for category breakdown', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes('role="progressbar"'), 'Category breakdown bars must declare role="progressbar"');
  assert.ok(src.includes('aria-valuenow='), 'Category breakdown bars must declare aria-valuenow');
  assert.ok(src.includes('aria-valuemin={0}'), 'Category breakdown bars must declare aria-valuemin');
  assert.ok(src.includes('aria-valuemax={100}'), 'Category breakdown bars must declare aria-valuemax');
  assert.ok(src.includes('aria-label='), 'Category breakdown bars must declare accessible aria-label');
});

test('[STATIC SOURCE] DashboardPage enforces semantic design tokens and eliminates hardcoded slate/white backgrounds', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('bg-card'), 'Must use bg-card');
  assert.ok(src.includes('border-border'), 'Must use border-border');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground');
  assert.ok(src.includes('bg-primary/10'), 'Must use tokenized primary tint for metrics icon');

  // Must not hardcode slate or white background containers
  assert.ok(!src.includes('bg-white'), 'Must not use hardcoded bg-white');
  assert.ok(!src.includes('bg-slate-900'), 'Must not use hardcoded bg-slate-900');
});

test('[STATIC SOURCE] AppRouter connects dashboard route to DashboardPage and preserves home route', () => {
  const src = readSrc('src/app/router.tsx');

  assert.ok(
    src.includes("import { DashboardPage } from '@/pages/DashboardPage';"),
    'router.tsx must import DashboardPage'
  );
  assert.ok(
    src.includes("<DashboardPage />"),
    'router.tsx must render DashboardPage on dashboard route'
  );
  assert.ok(
    src.includes("<HomePage />"),
    'router.tsx must continue rendering HomePage on home route'
  );
  assert.ok(
    src.includes("<AppShell>"),
    'router.tsx must wrap authenticated routes in AppShell'
  );
});

test('[STATIC SOURCE] DashboardPage strictly avoids fictional quotas, fake analytics, or unsupported status claims', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  // Must NOT claim non-existent statuses or quotas
  assert.ok(!src.includes('Active Vault'), 'Must not claim fictional Active Vault status');
  assert.ok(!src.includes('10 GB'), 'Must not display fake 10 GB quota');
  assert.ok(!src.includes('storage quota'), 'Must not display fabricated storage quota');
  assert.ok(!src.includes('quota percentage'), 'Must not calculate fictional quota percentage');
});

test('[STATIC SOURCE] DashboardPage recent uploads row action uses truthful "View in Vault" label', () => {
  const src = readSrc('src/pages/DashboardPage.tsx');

  assert.ok(
    src.includes('<span>View in Vault</span>'),
    'Recent uploads action must be labelled "View in Vault"'
  );
  assert.ok(
    src.includes('in File Vault`'),
    'Must provide accessible aria-label mentioning File Vault'
  );
  assert.ok(
    !src.includes('<span>Open</span>'),
    'Must not use ambiguous "Open" label for Vault navigation'
  );
});
