import React, { useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import type { FileItem } from '@/features/files/types';
import { Button } from '@/components/ui/Button';
import { EXPIRATION_OPTIONS, type ShareLinkStatus } from '@/features/sharing/types';
import { useShare } from '@/features/sharing/hooks/useShare';

export interface ShareModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusBadgeStyles: Record<ShareLinkStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  revoked: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ShareModal: React.FC<ShareModalProps> = ({ file, isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const {
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
  } = useShare({ file, isOpen });

  // Focus management and accessibility trap
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="share-modal-title" className="truncate font-semibold text-slate-900" title={file.fileName}>
                Share &ldquo;{file.fileName}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate secure, time-limited download links for guests
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close share dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banners */}
        {(createError || revokeError || listError) && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Sharing Operation Error</p>
                <p>{createError || revokeError || listError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearErrors}
              className="text-rose-500 hover:text-rose-700"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Newly Created Link Notification */}
        {newlyCreatedLink && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Share link generated successfully!</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedLink.shareUrl}
                aria-label="Generated share URL"
                className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => void copyToClipboard(newlyCreatedLink.shareUrl)}
                className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700"
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
            </div>

            <p className="text-[11px] text-emerald-700/90 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                For security, raw tokens are displayed only once. Database stores only cryptographic SHA-256 hashes.
              </span>
            </p>
          </div>
        )}

        {/* Expiration Duration Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Select Link Expiration Duration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {EXPIRATION_OPTIONS.map((option) => {
              const isSelected = selectedHours === option.hours;
              return (
                <button
                  key={option.hours}
                  type="button"
                  onClick={() => setSelectedHours(option.hours)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Clock className={`h-3.5 w-3.5 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>{option.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">{option.description}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => void createLink()}
              disabled={isCreating}
              className="w-full gap-2"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              <span>{isCreating ? 'Generating Secure Token...' : 'Create Share Link'}</span>
            </Button>
          </div>
        </div>

        {/* Existing Share Links for this File */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active &amp; Historical Links
            </h4>
            <span className="text-xs text-slate-400">
              {links.length} {links.length === 1 ? 'link' : 'links'}
            </span>
          </div>

          {isLoadingLinks ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              <span>Loading links...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No previous share links generated for this file.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {links.map((link) => {
                const createdDate = new Date(link.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const expiresDate = new Date(link.expiresAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`capitalize rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            statusBadgeStyles[link.status]
                          }`}
                        >
                          {link.status}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px] truncate">
                          ID: {link.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <span>Created {createdDate}</span>
                        <span>&bull;</span>
                        <span>Expires {expiresDate}</span>
                      </div>
                    </div>

                    {link.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void revokeLink(link.id)}
                        disabled={revokingId === link.id}
                        className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs shrink-0"
                      >
                        {revokingId === link.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Ban className="h-3 w-3" />
                        )}
                        <span>Revoke</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
