import React from 'react';
import { FileCard } from './FileCard';
import type { FileItem } from '@/features/files/types';

export interface FileGridViewProps {
  files: FileItem[];
  onSelect: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

export const FileGridView: React.FC<FileGridViewProps> = ({
  files,
  onSelect,
  onDownload,
  onDelete,
  onShare,
  isDownloading = false,
}) => {
  return (
    <div
      role="region"
      aria-label="Files Grid View"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {files.map((file) => (
        <FileCard
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
  );
};
