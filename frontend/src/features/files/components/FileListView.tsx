import React from 'react';
import { FileRow } from './FileRow';
import type { FileItem } from '@/features/files/types';

export interface FileListViewProps {
  files: FileItem[];
  onSelect: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

export const FileListView: React.FC<FileListViewProps> = ({
  files,
  onSelect,
  onDownload,
  onDelete,
  onShare,
  isDownloading = false,
}) => {
  return (
    <div role="table" aria-label="Files List View" className="space-y-2">
      {/* Table Column Header (Hidden on small mobile) */}
      <div
        role="row"
        className="hidden sm:flex items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/60"
      >
        <span role="columnheader" className="flex-1">File Name</span>
        <div className="flex items-center gap-6 shrink-0">
          <span role="columnheader" className="w-20 text-right">Size</span>
          <span role="columnheader" className="hidden md:inline-block w-28 text-right">Uploaded</span>
          <span role="columnheader" className="hidden lg:inline-block w-16 text-center">Category</span>
          <span role="columnheader" className="w-24 text-right pr-2">Actions</span>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            onSelect={onSelect}
            onDownload={onDownload}
            onDelete={onDelete}
            onShare={onShare}
            isDownloading={isDownloading}
          />
        ))}
      </div>
    </div>
  );
};
