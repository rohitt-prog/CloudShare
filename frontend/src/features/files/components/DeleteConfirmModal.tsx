import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FileItem } from '@/features/files/types';

export interface DeleteConfirmModalProps {
  file: FileItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  file,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 id="delete-dialog-title" className="text-base font-bold text-foreground">
              Delete File
            </h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground break-all">{file.fileName}</strong>?
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          This operation will permanently remove the file from both PostgreSQL metadata and private storage. This action cannot be undone.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
            className="border-input hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Permanently</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
