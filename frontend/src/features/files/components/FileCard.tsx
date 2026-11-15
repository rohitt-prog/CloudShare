import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  File,
  Download,
  Trash2,
  Share2,
  Info,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { FileItem, FileCategory } from '@/features/files/types';

export interface FileCardProps {
  file: FileItem;
  onSelect: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

export const CategoryIcon: React.FC<{ category: FileCategory; className?: string }> = ({
  category,
  className = 'h-6 w-6',
}) => {
  switch (category) {
    case 'documents':
      return <FileText className={cn('text-indigo-500 dark:text-indigo-400', className)} />;
    case 'images':
      return <ImageIcon className={cn('text-sky-500 dark:text-sky-400', className)} />;
    case 'media':
      return <Film className={cn('text-purple-500 dark:text-purple-400', className)} />;
    case 'archives':
      return <Archive className={cn('text-amber-500 dark:text-amber-400', className)} />;
    case 'other':
    default:
      return <File className={cn('text-muted-foreground', className)} />;
  }
};

export const FileCard: React.FC<FileCardProps> = ({
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
    <Card
      role="article"
      aria-label={`File card for ${file.fileName}`}
      className="group flex flex-col justify-between overflow-hidden border-border bg-card text-card-foreground transition-all duration-150 hover:border-primary/40 hover:shadow-md motion-reduce:transition-none"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/60 border border-border/50 group-hover:bg-primary/10 transition-colors">
            <CategoryIcon category={file.category} />
          </div>

          <Badge variant="outline" size="sm" className="capitalize text-[10px] font-medium shrink-0">
            {file.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex-1">
        <button
          type="button"
          onClick={() => onSelect(file)}
          title={file.fileName}
          className="text-left w-full group/title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <CardTitle className="text-sm font-semibold text-foreground truncate group-hover/title:text-primary transition-colors">
            {file.fileName}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{file.formattedSize}</span>
            <span>&bull;</span>
            <span className="truncate">{formattedDate}</span>
          </div>
        </button>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/50 bg-accent/20 px-4 py-2.5">
        <button
          type="button"
          onClick={() => onSelect(file)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          aria-label={`View details for ${file.fileName}`}
        >
          <Info className="h-3.5 w-3.5" />
          <span>Details</span>
        </button>

        <div className="flex items-center gap-1">
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(file)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title="Share file"
              aria-label={`Share ${file.fileName}`}
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(file)}
              disabled={isDownloading}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:pointer-events-none"
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
              onClick={() => onDelete(file)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title="Delete file"
              aria-label={`Delete ${file.fileName}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
