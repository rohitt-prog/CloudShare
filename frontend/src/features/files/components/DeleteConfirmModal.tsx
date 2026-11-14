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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
              Delete File
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-800 break-all">{file.fileName}</strong>?
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-rose-800">
          This operation will permanently remove the file from both PostgreSQL metadata and private storage. This action cannot be undone.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 gap-1.5"
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
