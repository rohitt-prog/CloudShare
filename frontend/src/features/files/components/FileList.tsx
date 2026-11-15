import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useFiles } from '@/features/files/hooks/useFiles';
import { FileStatsHeader } from './FileStatsHeader';
import { FileSearch } from './FileSearch';
import { FileFilters } from './FileFilters';
import { FileListView } from './FileListView';
import { FileGridView } from './FileGridView';
import { FileEmptyState } from './FileEmptyState';
import { FileDetails } from './FileDetails';
import { FileUpload } from './FileUpload';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ShareModal } from '@/features/sharing/components/ShareModal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { FileItem } from '@/features/files/types';

export const VIEW_MODE_STORAGE_KEY = 'cloudshare-view-mode';

const getInitialViewMode = (): 'list' | 'grid' => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'grid' || saved === 'list') {
      return saved;
    }
  } catch {
    // Gracefully handle restricted storage environments
  }
  return 'list';
};

export const FileList: React.FC = () => {
  const {
    files,
    allFiles,
    isLoading,
    error,
    isTableMissing,
    stats,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    sort,
    setSort,
    selectedFile,
    setSelectedFile,
    refetch,

    // Upload capabilities
    uploadFile,
    isUploading,
    uploadStatus,
    uploadError,
    clearUploadError,

    // Download capabilities
    downloadFile,
    isDownloading,
    downloadError,

    // Delete capabilities
    deleteFile,
    isDeleting,
    deleteError,
    deleteWarning,
    clearOperationErrors,
  } = useFiles();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(getInitialViewMode);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [fileToShare, setFileToShare] = useState<FileItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Gracefully handle storage errors
    }
  }, [viewMode]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('all');
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const result = await deleteFile(fileToDelete);
    if (result.success) {
      setFileToDelete(null);
    }
  };

  const isFiltered = Boolean(searchQuery.trim() || category !== 'all');

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <FileUpload
        onUpload={uploadFile}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
        onClearError={clearUploadError}
      />

      {/* Storage and Inventory Statistics */}
      <FileStatsHeader stats={stats} isTableMissing={isTableMissing} />

      {/* Download Error Alert */}
      {downloadError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Download Failed</p>
              <p className="text-foreground/80">{downloadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearOperationErrors}
            className="text-destructive/70 hover:text-destructive hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Delete Error Alert */}
      {deleteError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Delete Failed</p>
              <p className="text-foreground/80">{deleteError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearOperationErrors}
            className="text-destructive/70 hover:text-destructive hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Delete Warning Alert (Partial Success) */}
      {deleteWarning && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Partial Deletion</p>
              <p className="text-foreground/80">{deleteWarning}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearOperationErrors}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            aria-label="Dismiss warning"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm text-card-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <FileSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files by filename..."
          />
        </div>

        <FileFilters
          selectedCategory={category}
          onSelectCategory={setCategory}
          categoryCounts={stats.categoryCounts}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Loading State with Accessible Skeletons */}
      {isLoading && (
        <div className="space-y-4" role="status" aria-label="Loading files">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-border/50">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <span className="sr-only">Loading files...</span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Unable to load files</p>
            <p className="text-foreground/80">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* File Results */}
      {!isLoading && !error && (
        <>
          {files.length === 0 ? (
            <FileEmptyState
              isFiltered={isFiltered && allFiles.length > 0}
              onResetFilters={handleResetFilters}
              onRefresh={() => void refetch()}
              onUploadClick={() => {
                const el = document.getElementById('cloudshare-file-input');
                el?.click();
              }}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground">{files.length}</strong> of{' '}
                  <strong className="text-foreground">{allFiles.length}</strong> files
                </span>
                <span className="capitalize text-[11px] text-muted-foreground">
                  Sorted by {sort.field} ({sort.order === 'asc' ? 'ascending' : 'descending'})
                </span>
              </div>

              {viewMode === 'list' ? (
                <FileListView
                  files={files}
                  onSelect={setSelectedFile}
                  onDownload={(f) => void downloadFile(f)}
                  onDelete={(f) => setFileToDelete(f)}
                  onShare={(f) => setFileToShare(f)}
                  isDownloading={isDownloading}
                />
              ) : (
                <FileGridView
                  files={files}
                  onSelect={setSelectedFile}
                  onDownload={(f) => void downloadFile(f)}
                  onDelete={(f) => setFileToDelete(f)}
                  onShare={(f) => setFileToShare(f)}
                  isDownloading={isDownloading}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Modal File Details */}
      {selectedFile && (
        <FileDetails
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={(f) => void downloadFile(f)}
          onDelete={(f) => setFileToDelete(f)}
          onShare={(f) => setFileToShare(f)}
          isDownloading={isDownloading}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        file={fileToShare}
        isOpen={Boolean(fileToShare)}
        onClose={() => setFileToShare(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        file={fileToDelete}
        isOpen={Boolean(fileToDelete)}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
};
