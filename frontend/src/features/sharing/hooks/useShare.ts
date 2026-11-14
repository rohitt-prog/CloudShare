import { useState, useEffect, useCallback } from 'react';
import type { FileItem } from '@/features/files/types';
import {
  type ShareLinkItem,
  type CreateShareLinkSuccess,
  EXPIRATION_OPTIONS,
} from '@/features/sharing/types';
import { shareService } from '@/features/sharing/services/share.service';

export interface UseShareOptions {
  file: FileItem | null;
  isOpen: boolean;
}

export function useShare({ file, isOpen }: UseShareOptions) {
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [createError, setCreateError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [selectedHours, setSelectedHours] = useState<number>(EXPIRATION_OPTIONS[1].hours); // Default 24h
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<CreateShareLinkSuccess | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Load existing links when modal opens for a file
  const fetchLinks = useCallback(async () => {
    if (!file?.id || !isOpen) return;

    setIsLoadingLinks(true);
    setListError(null);

    const result = await shareService.listFileShareLinks(file.id);
    setIsLoadingLinks(false);

    if (result.success) {
      setLinks(result.links);
    } else {
      setListError(result.error);
    }
  }, [file?.id, isOpen]);

  useEffect(() => {
    if (isOpen && file?.id) {
      setNewlyCreatedLink(null);
      setCreateError(null);
      setRevokeError(null);
      setIsCopied(false);
      void fetchLinks();
    } else {
      setLinks([]);
      setNewlyCreatedLink(null);
      setCreateError(null);
      setListError(null);
      setRevokeError(null);
      setIsCopied(false);
    }
  }, [isOpen, file?.id, fetchLinks]);

  // Create a new share link
  const createLink = useCallback(async () => {
    if (!file?.id) return false;

    setIsCreating(true);
    setCreateError(null);

    const result = await shareService.createShareLink({
      fileId: file.id,
      expiresInHours: selectedHours,
    });

    setIsCreating(false);

    if (result.success) {
      setNewlyCreatedLink(result);
      // Refresh the existing links list so the new link is listed
      void fetchLinks();
      return true;
    } else {
      setCreateError(result.error);
      return false;
    }
  }, [file?.id, selectedHours, fetchLinks]);

  // Revoke an active share link
  const revokeLink = useCallback(async (linkId: string) => {
    setRevokingId(linkId);
    setRevokeError(null);

    const result = await shareService.revokeShareLink(linkId);
    setRevokingId(null);

    if (result.success) {
      // Optimistically update link status or re-fetch
      setLinks((prev) =>
        prev.map((item) =>
          item.id === linkId
            ? { ...item, revokedAt: new Date().toISOString(), status: 'revoked' }
            : item
        )
      );
      return true;
    } else {
      setRevokeError(result.error);
      return false;
    }
  }, []);

  // Copy share URL to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch {
      // Fallback for older environments
      setIsCopied(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setCreateError(null);
    setListError(null);
    setRevokeError(null);
  }, []);

  return {
    links,
    isLoadingLinks,
    isCreating,
    revokingId,
    createError,
    listError,
    revokeError,
    selectedHours,
    setSelectedHours,
    newlyCreatedLink,
    isCopied,
    createLink,
    revokeLink,
    copyToClipboard,
    clearErrors,
    refetchLinks: fetchLinks,
  };
}
