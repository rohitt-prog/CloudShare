import React from 'react';
import { FileQuestion, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FileEmptyStateProps {
  isFiltered: boolean;
  onResetFilters?: () => void;
  onRefresh?: () => void;
}

export const FileEmptyState: React.FC<FileEmptyStateProps> = ({
  isFiltered,
  onResetFilters,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
        {isFiltered ? (
          <FileQuestion className="h-7 w-7 text-slate-500" />
        ) : (
          <FolderOpen className="h-7 w-7 text-slate-500" />
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {isFiltered ? 'No files match your search' : 'Your vault is empty'}
      </h3>

      <p className="max-w-sm text-xs text-slate-500 mb-6 leading-relaxed">
        {isFiltered
          ? 'Try adjusting your search keywords or switching category filters to find what you are looking for.'
          : 'No file metadata records have been registered yet. Once file upload is enabled in Phase 5, uploaded files will appear here.'}
      </p>

      <div className="flex items-center gap-2">
        {isFiltered && onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset filters
          </Button>
        )}
        {onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        )}
      </div>
    </div>
  );
};
