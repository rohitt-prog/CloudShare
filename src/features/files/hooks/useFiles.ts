import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { fileService } from '@/features/files/services/file.service';
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
      return;
    }

    // Immediately purge all prior account data and selection before initiating request
    setRawFiles([]);
    setLoadedOwnerId(null);
    setSelectedFile(null);
    setIsLoading(true);
    setError(null);
    setIsTableMissing(false);

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
  };
}
