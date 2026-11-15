import React from 'react';
import {
  Download,
  Trash2,
  Share2,
  Info,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from './FileCard';
import type { FileItem } from '@/features/files/types';

export interface FileRowProps {
  file: FileItem;
  onSelect: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

export const FileRow: React.FC<FileRowProps> = ({
  file,
  onSelect,
  onDownload,
  onDelete,
  onShare,
  isDownloading = false,
}) => {
  const formattedDate = new Date(file.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      role="row"
      aria-label={`File ${file.fileName}`}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 text-card-foreground transition-all duration-150 hover:bg-accent/40 hover:border-primary/40 motion-reduce:transition-none"
    >
      {/* File Type Icon & Name */}
      <div
        onClick={() => onSelect(file)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(file);
          }
        }}
        className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-0.5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/60 border border-border/50 group-hover:bg-primary/10 transition-colors">
          <CategoryIcon category={file.category} className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
            title={file.fileName}
          >
            {file.fileName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 sm:hidden">
            <span className="font-mono">{file.formattedSize}</span>
            <span>&bull;</span>
            <span className="truncate">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Desktop & Tablet Metadata Columns */}
      <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
        <span className="font-mono w-20 text-right">{file.formattedSize}</span>
        <span className="hidden md:inline-block w-28 text-right truncate">{formattedDate}</span>
        <Badge variant="outline" size="sm" className="hidden lg:inline-flex capitalize text-[10px]">
          {file.category}
        </Badge>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(file);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Share file"
            aria-label={`Share ${file.fileName}`}
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}

        {onDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(file);
            }}
            disabled={isDownloading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            title="Download file"
            aria-label={`Download ${file.fileName}`}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Delete file"
            aria-label={`Delete ${file.fileName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(file);
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Inspect file metadata"
          aria-label={`Inspect metadata for ${file.fileName}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
