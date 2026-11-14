import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { fileService, triggerBrowserDownload } from '@/features/files/services/file.service';
import type {
  FileItem,
  FileCategory,
  FileSortOption,
  FileStats,
} from '@/features/files/types';
import {
  formatByteSize,
  parseTimestampSafe,
  deriveIsolatedFileState,
} from '@/features/files/types';

export function useFiles() {
  const { user } = useAuth();
  const [rawFiles, setRawFiles] = useState<FileItem[]>([]);
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState<boolean>(false);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Operation states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Filter and Sort states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<FileCategory>('all');
  const [sort, setSort] = useState<FileSortOption>({ field: 'date', order: 'desc' });
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  // Request race condition counter
  const requestIdRef = useRef<number>(0);

  const refetch = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  const clearOperationErrors = useCallback(() => {
    setUploadError(null);
    setDownloadError(null);
    setDeleteError(null);
    setDeleteWarning(null);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const currentRequestId = ++requestIdRef.current;
    const targetUserId = user?.id ?? null;

    if (!targetUserId) {
      setRawFiles([]);
      setLoadedOwnerId(null);
      setSelectedFile(null);
      setIsLoading(false);
      setError(null);
      setIsTableMissing(false);
      setUploadError(null);
      setDownloadError(null);
      setDeleteError(null);
      setDeleteWarning(null);
      return;
    }

    // Immediately purge all prior account data and selection before initiating request
    setRawFiles([]);
    setLoadedOwnerId(null);
    setSelectedFile(null);
    setIsLoading(true);
    setError(null);
    setIsTableMissing(false);
    setUploadError(null);
    setDownloadError(null);
    setDeleteError(null);
    setDeleteWarning(null);

    const executeFetch = async () => {
      try {
        const result = await fileService.listFiles(targetUserId);

        // Discard if effect cleaned up or a newer request began
        if (!isCurrent || requestIdRef.current !== currentRequestId) {
          return;
        }

        if (result.error) {
          setError(result.error);
          setRawFiles([]);
          setLoadedOwnerId(targetUserId);
        } else {
          setRawFiles(result.files);
          setLoadedOwnerId(targetUserId);
          setIsTableMissing(Boolean(result.isTableMissing));
        }
      } catch (err) {
        if (!isCurrent || requestIdRef.current !== currentRequestId) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch files.');
        setRawFiles([]);
        setLoadedOwnerId(targetUserId);
      } finally {
        if (isCurrent && requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    };

    void executeFetch();

    return () => {
      isCurrent = false;
    };
  }, [user, reloadTrigger]);

  // Synchronous render-time account isolation guard:
  // Derived state guarantees that even on the intermediate render before useEffect runs,
  // Account A's files, selection, and statistics can NEVER render under Account B.
  const { visibleFiles, visibleSelectedFile, isOwnerMatch } = useMemo(() => {
    return deriveIsolatedFileState(
      user?.id,
      loadedOwnerId,
      rawFiles,
      selectedFile
    );
  }, [user?.id, loadedOwnerId, rawFiles, selectedFile]);

  // Compute storage statistics across quarantined/visible files only
  const stats = useMemo<FileStats>(() => {
    const totalFiles = visibleFiles.length;
    const totalSizeBytes = visibleFiles.reduce((acc, file) => acc + file.fileSize, 0);

    const categoryCounts: Record<FileCategory, number> = {
      all: totalFiles,
      documents: 0,
      images: 0,
      media: 0,
      archives: 0,
      other: 0,
    };

    visibleFiles.forEach((file) => {
      if (categoryCounts[file.category] !== undefined) {
        categoryCounts[file.category]++;
      } else {
        categoryCounts.other++;
      }
    });

    return {
      totalFiles,
      totalSizeBytes,
      formattedTotalSize: formatByteSize(totalSizeBytes),
      categoryCounts,
    };
  }, [visibleFiles]);

  // Filter and sort files based on isolated visible files
  const filteredFiles = useMemo<FileItem[]>(() => {
    return visibleFiles
      .filter((file) => {
        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          if (!file.fileName.toLowerCase().includes(query)) {
            return false;
          }
        }

        // Category filter
        if (category !== 'all' && file.category !== category) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sort.field === 'name') {
          comparison = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' });
        } else if (sort.field === 'size') {
          comparison = a.fileSize - b.fileSize;
        } else if (sort.field === 'date') {
          const timeA = parseTimestampSafe(a.createdAt);
          const timeB = parseTimestampSafe(b.createdAt);
          comparison = timeA - timeB;
          // Deterministic tie-breaker for identical or invalid timestamps
          if (comparison === 0) {
            comparison = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' });
          }
        }

        return sort.order === 'asc' ? comparison : -comparison;
      });
  }, [visibleFiles, searchQuery, category, sort]);

  /**
   * Uploads a file with truthful status tracking and refreshes the vault on success.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<{ success: boolean; file: FileItem | null; error: string | null }> => {
      if (!user) {
        const errMsg = 'You must be signed in to upload files.';
        setUploadError(errMsg);
        return { success: false, file: null, error: errMsg };
      }

      setIsUploading(true);
      setUploadStatus(`Uploading ${file.name} (${formatByteSize(file.size)})...`);
      setUploadError(null);

      try {
        const result = await fileService.uploadFile(file, user.id);

        if (result.error || !result.file) {
          setUploadError(result.error || 'Failed to upload file.');
          return { success: false, file: null, error: result.error };
        }

        // Auto-refresh the file list
        refetch();
        return { success: true, file: result.file, error: null };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during upload.';
        setUploadError(errMsg);
        return { success: false, file: null, error: errMsg };
      } finally {
        setIsUploading(false);
        setUploadStatus(null);
      }
    },
    [user, refetch]
  );

  /**
   * Downloads a private file from storage and triggers browser file save.
   */
  const downloadFile = useCallback(
    async (file: FileItem): Promise<{ success: boolean; error: string | null }> => {
      if (!user) {
        const errMsg = 'You must be signed in to download files.';
        setDownloadError(errMsg);
        return { success: false, error: errMsg };
      }

      setIsDownloading(true);
      setDownloadError(null);

      try {
        const result = await fileService.downloadFile(file, user.id);

        if (result.error || !result.blob) {
          setDownloadError(result.error || 'Failed to download file.');
          return { success: false, error: result.error };
        }

        // Trigger native browser download
        triggerBrowserDownload(result.blob, file.fileName);
        return { success: true, error: null };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during download.';
        setDownloadError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setIsDownloading(false);
      }
    },
    [user]
  );

  /**
   * Deletes a file from database and storage, and purges selection.
   * Accurately distinguishes between complete success and partial deletion failure.
   */
  const deleteFile = useCallback(
    async (
      file: FileItem
    ): Promise<{
      success: boolean;
      isPartial?: boolean;
      warning?: string | null;
      error: string | null;
    }> => {
      if (!user) {
        const errMsg = 'You must be signed in to delete files.';
        setDeleteError(errMsg);
        return { success: false, isPartial: false, warning: null, error: errMsg };
      }

      setIsDeleting(true);
      setDeleteError(null);
      setDeleteWarning(null);

      try {
        const result = await fileService.deleteFile(file, user.id);

        if (!result.success || result.error) {
          setDeleteError(result.error || 'Failed to delete file.');
          return { success: false, isPartial: false, warning: null, error: result.error };
        }

        if (result.isPartial && result.warning) {
          setDeleteWarning(result.warning);
        }

        // Purge selection if currently selected file was deleted
        if (selectedFile?.id === file.id) {
          setSelectedFile(null);
        }

        // Auto-refresh the file list
        refetch();
        return result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during deletion.';
        setDeleteError(errMsg);
        return { success: false, isPartial: false, warning: null, error: errMsg };
      } finally {
        setIsDeleting(false);
      }
    },
    [user, selectedFile, refetch]
  );

  // If the loaded data does not match the current user, effective loading is true
  const effectiveLoading = Boolean(user) && (!isOwnerMatch || isLoading);

  return {
    files: filteredFiles,
    allFiles: visibleFiles,
    isLoading: effectiveLoading,
    error: isOwnerMatch ? error : null,
    isTableMissing: isOwnerMatch ? isTableMissing : false,
    stats,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    sort,
    setSort,
    selectedFile: visibleSelectedFile,
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
  };
}
