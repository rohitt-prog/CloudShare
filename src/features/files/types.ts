/**
 * Files Feature Domain Types
 */

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  ownerId: string;
  isStarred?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadPayload {
  file: File;
  name: string;
  size: number;
  mimeType: string;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progressPercent: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
}
