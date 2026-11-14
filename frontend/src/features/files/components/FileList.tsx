import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useFiles } from '@/features/files/hooks/useFiles';
import { FileStatsHeader } from './FileStatsHeader';
import { FileSearch } from './FileSearch';
import { FileFilters } from './FileFilters';
import { FileRow } from './FileRow';
import { FileEmptyState } from './FileEmptyState';
import { FileDetails } from './FileDetails';
import { Button } from '@/components/ui/Button';

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
  } = useFiles();

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('all');
  };

  const isFiltered = Boolean(searchQuery.trim() || category !== 'all');

  return (
    <div className="space-y-6">
      {/* Storage and Inventory Statistics */}
      <FileStatsHeader stats={stats} isTableMissing={isTableMissing} />

      {/* Search and Filter Controls */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
          <p className="text-sm font-medium text-slate-600">Loading your files...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-rose-900">Unable to load files</p>
            <p>{error}</p>
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
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{files.length}</strong> of{' '}
                  <strong className="text-slate-700">{allFiles.length}</strong> files
                </span>
                <span className="capitalize text-[11px] text-slate-400">
                  Sorted by {sort.field} ({sort.order === 'asc' ? 'ascending' : 'descending'})
                </span>
              </div>

              <div className="space-y-2">
                {files.map((file) => (
                  <FileRow key={file.id} file={file} onSelect={setSelectedFile} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal File Details */}
      {selectedFile && (
        <FileDetails file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
};
