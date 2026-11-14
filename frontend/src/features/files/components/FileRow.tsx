import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  File,
  Info,
  Download,
  Trash2,
  Share2,
} from 'lucide-react';
import type { FileItem, FileCategory } from '@/features/files/types';

export interface FileRowProps {
  file: FileItem;
  onSelect: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

const CategoryIcon: React.FC<{ category: FileCategory }> = ({ category }) => {
  switch (category) {
    case 'documents':
      return <FileText className="h-5 w-5 text-indigo-600" />;
    case 'images':
      return <ImageIcon className="h-5 w-5 text-sky-600" />;
    case 'media':
      return <Film className="h-5 w-5 text-purple-600" />;
    case 'archives':
      return <Archive className="h-5 w-5 text-amber-600" />;
    case 'other':
    default:
      return <File className="h-5 w-5 text-slate-500" />;
  }
};

const categoryBadgeStyles: Record<FileCategory, string> = {
  all: 'bg-slate-100 text-slate-700',
  documents: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  images: 'bg-sky-50 text-sky-700 border-sky-100',
  media: 'bg-purple-50 text-purple-700 border-purple-100',
  archives: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

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
      onClick={() => onSelect(file)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(file);
        }
      }}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-sky-300 hover:shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-sky-50 group-hover:border-sky-100 transition-colors">
          <CategoryIcon category={file.category} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors" title={file.fileName}>
            {file.fileName}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="font-mono text-slate-500">{file.formattedSize}</span>
            <span>&bull;</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`hidden md:inline-flex capitalize rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
            categoryBadgeStyles[file.category]
          }`}
        >
          {file.category}
        </span>

        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(file);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            title="Download file"
            aria-label={`Download ${file.fileName}`}
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          title="Inspect file metadata"
          aria-label={`Inspect metadata for ${file.fileName}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
