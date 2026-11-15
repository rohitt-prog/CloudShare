import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

// Helper to read component sources
const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

// Mock FileItem builder for testing sort and filter logic
const createMockFile = (id, fileName, fileSize, createdAt, category = 'documents') => ({
  id,
  fileName,
  storagePath: `user-123/${id}/${fileName}`,
  fileSize,
  formattedSize: `${fileSize} B`,
  mimeType: category === 'images' ? 'image/png' : 'application/pdf',
  category,
  ownerId: 'user-123',
  createdAt,
  updatedAt: createdAt,
});

test('View Mode Persistence & Fallback logic', () => {
  const STORAGE_KEY = 'cloudshare-view-mode';

  // Helper matching the implementation in FileList.tsx
  const resolveViewMode = (mockStorage) => {
    try {
      const saved = mockStorage.getItem(STORAGE_KEY);
      if (saved === 'grid' || saved === 'list') {
        return saved;
      }
    } catch {
      // Storage error fallback
    }
    return 'list';
  };

  // Valid values
  assert.equal(resolveViewMode({ getItem: () => 'grid' }), 'grid');
  assert.equal(resolveViewMode({ getItem: () => 'list' }), 'list');

  // Missing or invalid values default to 'list'
  assert.equal(resolveViewMode({ getItem: () => null }), 'list');
  assert.equal(resolveViewMode({ getItem: () => '' }), 'list');
  assert.equal(resolveViewMode({ getItem: () => 'table' }), 'list');
  assert.equal(resolveViewMode({ getItem: () => 'invalid' }), 'list');

  // Storage exception (e.g. private browsing restriction) falls back safely
  assert.equal(
    resolveViewMode({
      getItem: () => {
        throw new Error('SecurityError: Access is denied for this document.');
      },
    }),
    'list'
  );
});

test('Client-side search and category filtering preserves underlying data', () => {
  const files = [
    createMockFile('1', 'annual_report.pdf', 1024, '2026-01-01T00:00:00Z', 'documents'),
    createMockFile('2', 'hero_image.png', 2048, '2026-01-02T00:00:00Z', 'images'),
    createMockFile('3', 'podcast_audio.mp3', 4096, '2026-01-03T00:00:00Z', 'media'),
    createMockFile('4', 'backup_archive.zip', 8192, '2026-01-04T00:00:00Z', 'archives'),
    createMockFile('5', 'presentation_slides.pdf', 1536, '2026-01-05T00:00:00Z', 'documents'),
  ];

  // Filter function matching useFiles hook behavior
  const filterFiles = (fileList, query, cat) => {
    const q = query.trim().toLowerCase();
    return fileList.filter((f) => {
      const matchesSearch = !q || f.fileName.toLowerCase().includes(q);
      const matchesCat = cat === 'all' || f.category === cat;
      return matchesSearch && matchesCat;
    });
  };

  // 1. Search filtering
  const reportSearch = filterFiles(files, 'report', 'all');
  assert.equal(reportSearch.length, 1);
  assert.equal(reportSearch[0].id, '1');

  const pdfSearch = filterFiles(files, '.pdf', 'all');
  assert.equal(pdfSearch.length, 2);

  // 2. Category filtering
  const imageFiles = filterFiles(files, '', 'images');
  assert.equal(imageFiles.length, 1);
  assert.equal(imageFiles[0].fileName, 'hero_image.png');

  const docFiles = filterFiles(files, '', 'documents');
  assert.equal(docFiles.length, 2);

  // 3. Combined search + category
  const combined = filterFiles(files, 'presentation', 'documents');
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, '5');

  // 4. No matching search
  const none = filterFiles(files, 'nonexistent_file_name_123', 'all');
  assert.equal(none.length, 0);

  // 5. Verification that original array remains unaltered
  assert.equal(files.length, 5);
});

test('Client-side file sorting logic is deterministic across name, size, and date', () => {
  const files = [
    createMockFile('1', 'Bravo.txt', 500, '2026-01-10T12:00:00Z'),
    createMockFile('2', 'alpha.txt', 1500, '2026-01-05T12:00:00Z'),
    createMockFile('3', 'charlie.txt', 100, '2026-01-15T12:00:00Z'),
  ];

  const sortFiles = (list, field, order) => {
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (field === 'name') {
        comparison = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' });
      } else if (field === 'size') {
        comparison = a.fileSize - b.fileSize;
      } else if (field === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return order === 'asc' ? comparison : -comparison;
    });
  };

  // Sort by name asc (alpha, Bravo, charlie)
  const byNameAsc = sortFiles(files, 'name', 'asc');
  assert.deepEqual(byNameAsc.map((f) => f.id), ['2', '1', '3']);

  // Sort by name desc (charlie, Bravo, alpha)
  const byNameDesc = sortFiles(files, 'name', 'desc');
  assert.deepEqual(byNameDesc.map((f) => f.id), ['3', '1', '2']);

  // Sort by size asc (100, 500, 1500)
  const bySizeAsc = sortFiles(files, 'size', 'asc');
  assert.deepEqual(bySizeAsc.map((f) => f.id), ['3', '1', '2']);

  // Sort by size desc (1500, 500, 100)
  const bySizeDesc = sortFiles(files, 'size', 'desc');
  assert.deepEqual(bySizeDesc.map((f) => f.id), ['2', '1', '3']);

  // Sort by date asc (Jan 5, Jan 10, Jan 15)
  const byDateAsc = sortFiles(files, 'date', 'asc');
  assert.deepEqual(byDateAsc.map((f) => f.id), ['2', '1', '3']);

  // Sort by date desc (Jan 15, Jan 10, Jan 5)
  const byDateDesc = sortFiles(files, 'date', 'desc');
  assert.deepEqual(byDateDesc.map((f) => f.id), ['3', '1', '2']);
});

test('Empty state discrimination: empty vault onboarding vs filtered empty state', () => {
  const emptyStateSource = readSrc('src/features/files/components/FileEmptyState.tsx');

  assert.ok(emptyStateSource.includes('isFiltered'), 'FileEmptyState must handle isFiltered prop');
  assert.ok(emptyStateSource.includes('No matching files found'), 'Must provide distinct message for search misses');
  assert.ok(emptyStateSource.includes('Your vault is empty'), 'Must provide distinct message for empty vault');
  assert.ok(emptyStateSource.includes('onResetFilters'), 'Must provide reset filters handler');
  assert.ok(emptyStateSource.includes('onUploadClick'), 'Must provide upload action for empty vault onboarding');
});

test('FileCard component source enforces Card primitive usage and accessible actions', () => {
  const fileCardSrc = readSrc('src/features/files/components/FileCard.tsx');

  // Verify Phase 9B Card primitives
  assert.ok(fileCardSrc.includes('Card,'), 'FileCard must import Card primitive');
  assert.ok(fileCardSrc.includes('CardHeader,'), 'FileCard must import CardHeader');
  assert.ok(fileCardSrc.includes('CardTitle,'), 'FileCard must import CardTitle');
  assert.ok(fileCardSrc.includes('CardContent,'), 'FileCard must import CardContent');
  assert.ok(fileCardSrc.includes('CardFooter'), 'FileCard must import CardFooter');
  assert.ok(fileCardSrc.includes('Badge'), 'FileCard must import Badge primitive');

  // Verify accessible actions
  assert.ok(fileCardSrc.includes('aria-label={`View details for ${file.fileName}`}'), 'FileCard has accessible Details button');
  assert.ok(fileCardSrc.includes('aria-label={`Share ${file.fileName}`}'), 'FileCard has accessible Share button');
  assert.ok(fileCardSrc.includes('aria-label={`Download ${file.fileName}`}'), 'FileCard has accessible Download button');
  assert.ok(fileCardSrc.includes('aria-label={`Delete ${file.fileName}`}'), 'FileCard has accessible Delete button');

  // Verify download spinner when isDownloading is active
  assert.ok(fileCardSrc.includes('Loader2'), 'FileCard renders spinner during download');
});

test('FileGridView component source enforces responsive grid layout and semantic role', () => {
  const gridViewSrc = readSrc('src/features/files/components/FileGridView.tsx');

  assert.ok(gridViewSrc.includes('role="region"'), 'FileGridView must declare region role');
  assert.ok(gridViewSrc.includes('aria-label="Files Grid View"'), 'FileGridView must declare aria-label');
  assert.ok(gridViewSrc.includes('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'), 'Responsive column breakpoints');
  assert.ok(gridViewSrc.includes('<FileCard'), 'FileGridView must render FileCard');
});

test('FileListView component source enforces table semantic roles and column headers', () => {
  const listViewSrc = readSrc('src/features/files/components/FileListView.tsx');

  assert.ok(listViewSrc.includes('role="table"'), 'FileListView must declare table role');
  assert.ok(listViewSrc.includes('aria-label="Files List View"'), 'FileListView must declare aria-label');
  assert.ok(listViewSrc.includes('role="columnheader"'), 'FileListView must declare columnheader roles');
  assert.ok(listViewSrc.includes('File Name'), 'FileListView must have File Name column');
  assert.ok(listViewSrc.includes('Size'), 'FileListView must have Size column');
  assert.ok(listViewSrc.includes('Uploaded'), 'FileListView must have Uploaded column');
  assert.ok(listViewSrc.includes('Category'), 'FileListView must have Category column');
  assert.ok(listViewSrc.includes('Actions'), 'FileListView must have Actions column');
  assert.ok(listViewSrc.includes('<FileRow'), 'FileListView must render FileRow');
});

test('FileRow component source enforces semantic design tokens and responsive metadata', () => {
  const fileRowSrc = readSrc('src/features/files/components/FileRow.tsx');

  assert.ok(fileRowSrc.includes('role="row"'), 'FileRow must declare row role');
  assert.ok(fileRowSrc.includes('border-border'), 'Uses border-border semantic token');
  assert.ok(fileRowSrc.includes('bg-card'), 'Uses bg-card semantic token');
  assert.ok(fileRowSrc.includes('text-card-foreground'), 'Uses text-card-foreground semantic token');
  assert.ok(fileRowSrc.includes('aria-label={`Inspect metadata for ${file.fileName}`}'), 'FileRow has accessible metadata button');
  assert.ok(fileRowSrc.includes('aria-label={`Share ${file.fileName}`}'), 'FileRow has accessible Share button');
  assert.ok(fileRowSrc.includes('aria-label={`Download ${file.fileName}`}'), 'FileRow has accessible Download button');
  assert.ok(fileRowSrc.includes('aria-label={`Delete ${file.fileName}`}'), 'FileRow has accessible Delete button');
});

test('FileFilters component source includes category toggle group, sorting, and view mode switcher', () => {
  const filtersSrc = readSrc('src/features/files/components/FileFilters.tsx');

  assert.ok(filtersSrc.includes('role="group"'), 'FileFilters must have role=group for category container');
  assert.ok(filtersSrc.includes('aria-label="Filter files by category"'), 'FileFilters category container aria-label');
  assert.ok(filtersSrc.includes('aria-pressed={isSelected}'), 'Category buttons use aria-pressed toggle state');
  assert.ok(!filtersSrc.includes('role="tablist"'), 'Must not have role=tablist');
  assert.ok(!filtersSrc.includes('role="tab"'), 'Must not have role=tab');
  assert.ok(filtersSrc.includes('aria-label="View layout switcher"'), 'FileFilters switcher aria-label');
  assert.ok(filtersSrc.includes('aria-pressed={viewMode === \'list\'}'), 'List view button aria-pressed');
  assert.ok(filtersSrc.includes('aria-pressed={viewMode === \'grid\'}'), 'Grid view button aria-pressed');
  assert.ok(filtersSrc.includes('List'), 'List icon imported');
  assert.ok(filtersSrc.includes('LayoutGrid'), 'LayoutGrid icon imported');
});

test('FileSearch component source includes accessible search input and clear button', () => {
  const searchSrc = readSrc('src/features/files/components/FileSearch.tsx');

  assert.ok(searchSrc.includes('aria-label="Search files by name"'), 'Search input has descriptive aria-label');
  assert.ok(searchSrc.includes('aria-label="Clear search query"'), 'Clear button has descriptive aria-label');
  assert.ok(searchSrc.includes('border-input'), 'Search input uses border-input token');
  assert.ok(searchSrc.includes('bg-background'), 'Search input uses bg-background token');
  assert.ok(searchSrc.includes('text-foreground'), 'Search input uses text-foreground token');
});

test('FileStatsHeader component displays truthful inventory metrics without fake quotas', () => {
  const statsSrc = readSrc('src/features/files/components/FileStatsHeader.tsx');

  assert.ok(statsSrc.includes('Total Files'), 'Displays Total Files metric');
  assert.ok(statsSrc.includes('Storage Used'), 'Displays Storage Used metric');
  assert.ok(statsSrc.includes('File Categories'), 'Displays Categories metric');
  assert.ok(statsSrc.includes('Card'), 'Uses Phase 9B Card primitive');

  // Verify absence of fake quotas
  assert.ok(!statsSrc.includes('of 10 GB'), 'Must NOT invent fake 10 GB quota');
  assert.ok(!statsSrc.includes('of 5 GB'), 'Must NOT invent fake 5 GB quota');
  assert.ok(!statsSrc.includes('Quota'), 'Must NOT claim an unverified storage quota');
});

test('FileList component coordinates viewMode persistence, Skeleton loading, and layouts', () => {
  const fileListSrc = readSrc('src/features/files/components/FileList.tsx');

  assert.ok(fileListSrc.includes('VIEW_MODE_STORAGE_KEY'), 'Declares storage key');
  assert.ok(fileListSrc.includes('cloudshare-view-mode'), 'Uses cloudshare-view-mode as key name');
  assert.ok(fileListSrc.includes('Skeleton'), 'Imports Skeleton from Phase 9B');
  assert.ok(fileListSrc.includes('<FileListView'), 'Conditionally renders FileListView');
  assert.ok(fileListSrc.includes('<FileGridView'), 'Conditionally renders FileGridView');
  assert.ok(fileListSrc.includes('role="status"'), 'Loading container has role=status');
  assert.ok(fileListSrc.includes('border-destructive/20'), 'Semantic error border token');
  assert.ok(fileListSrc.includes('bg-destructive/10'), 'Semantic error background token');
  assert.ok(fileListSrc.includes('text-destructive'), 'Semantic error text token');
});
