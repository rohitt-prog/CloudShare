import React from 'react';
import { FileQuestion, FolderOpen, RefreshCw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FileEmptyStateProps {
  isFiltered: boolean;
  onResetFilters?: () => void;
  onRefresh?: () => void;
  onUploadClick?: () => void;
}

export const FileEmptyState: React.FC<FileEmptyStateProps> = ({
  isFiltered,
  onResetFilters,
  onRefresh,
  onUploadClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground mb-4 shadow-xs">
        {isFiltered ? (
          <FileQuestion className="h-7 w-7 text-muted-foreground" />
        ) : (
          <FolderOpen className="h-7 w-7 text-primary" />
        )}
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">
        {isFiltered ? 'No matching files found' : 'Your vault is empty'}
      </h3>

      <p className="max-w-sm text-xs text-muted-foreground mb-6 leading-relaxed">
        {isFiltered
          ? 'Try adjusting your search keywords or switching category filters to find what you are looking for.'
          : 'No files have been uploaded to your private vault yet. Select or drop a file above to begin.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isFiltered && onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset filters
          </Button>
        )}
        {!isFiltered && onUploadClick && (
          <Button variant="primary" size="sm" onClick={onUploadClick} className="gap-1.5">
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload File</span>
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
