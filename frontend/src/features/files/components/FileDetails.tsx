import React, { useEffect, useRef } from 'react';
import { X, FileText, Calendar, HardDrive, Shield, Key, Folder, Download, Trash2, Share2 } from 'lucide-react';
import type { FileItem } from '@/features/files/types';
import { Button } from '@/components/ui/Button';

export interface FileDetailsProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  isDownloading?: boolean;
}

export const FileDetails: React.FC<FileDetailsProps> = ({
  file,
  onClose,
  onDownload,
  onDelete,
  onShare,
  isDownloading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 1. Capture previously active element to restore focus on close
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Move focus into the dialog (close button) upon opening
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    // 3. Trap keyboard focus (Tab / Shift+Tab) and handle Escape dismissal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus on close
      previousActiveElementRef.current?.focus();
    };
  }, [onClose]);

  if (!file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl space-y-6 animate-slideInUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="file-details-title" className="truncate font-semibold text-foreground" title={file.fileName}>
                {file.fileName}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">{file.category} file</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata Properties */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">File Size</span>
            </div>
            <p className="font-semibold text-foreground">{file.formattedSize}</p>
            <p className="text-[10px] text-muted-foreground font-mono">({file.fileSize.toLocaleString()} bytes)</p>
          </div>

          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Folder className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-medium">MIME Type</span>
            </div>
            <p className="font-semibold text-foreground truncate" title={file.mimeType || 'unknown'}>
              {file.mimeType || 'application/octet-stream'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">Uploaded Date</span>
            </div>
            <p className="font-semibold text-foreground">
              {new Date(file.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Shield className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-medium">Security & Storage</span>
            </div>
            <p className="font-semibold text-foreground">Private Bucket</p>
            <p className="text-[10px] text-muted-foreground font-mono">RLS Path Isolated</p>
          </div>
        </div>

        {/* Technical IDs */}
        <div className="space-y-2 rounded-xl border border-border bg-accent/20 p-3.5 text-[11px]">
          <div>
            <span className="text-muted-foreground font-medium">Storage Path:</span>
            <p className="font-mono text-foreground truncate" title={file.storagePath}>
              {file.storagePath}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground font-medium">File UUID:</span>
            <p className="font-mono text-foreground">{file.id}</p>
          </div>

          <div>
            <span className="text-muted-foreground font-medium">Owner UUID:</span>
            <p className="font-mono text-foreground">{file.ownerId}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Key className="h-3.5 w-3.5 text-emerald-500" />
            <span>Encrypted metadata access</span>
          </div>

          <div className="flex items-center gap-2">
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onShare(file);
                  onClose();
                }}
                className="gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDelete(file);
                  onClose();
                }}
                className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            )}

            {onDownload && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onDownload(file)}
                disabled={isDownloading}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
