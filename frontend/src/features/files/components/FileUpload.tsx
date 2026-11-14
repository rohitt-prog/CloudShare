import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { validateFileForUpload, formatByteSize } from '@/features/files/types';

export interface FileUploadProps {
  onUpload: (file: File) => Promise<{ success: boolean; error: string | null }>;
  isUploading: boolean;
  uploadStatus: string | null;
  uploadError: string | null;
  onClearError: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  isUploading,
  uploadStatus,
  uploadError,
  onClearError,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback(
    (file: File | null) => {
      onClearError();
      setSuccessMessage(null);

      if (!file) {
        setSelectedFile(null);
        setValidationError(null);
        return;
      }

      const validation = validateFileForUpload(file);
      if (!validation.isValid) {
        setValidationError(validation.error);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setValidationError(null);
      setSelectedFile(file);
    },
    [onClearError]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelection]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleInitiateUpload = async () => {
    if (!selectedFile || isUploading) return;

    const result = await onUpload(selectedFile);
    if (result.success) {
      setSuccessMessage(`"${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Auto-dismiss success message after 4 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    onClearError();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upload to Private Vault</h2>
            <p className="text-xs text-slate-500">Max file size: 50 MB &bull; Encrypted storage</p>
          </div>
        </div>
        {selectedFile && !isUploading && (
          <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="text-slate-400">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-rose-500 hover:text-rose-700"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Upload Failed</p>
              <p>{uploadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-rose-500 hover:text-rose-700"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload Success Alert */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleChange}
        disabled={isUploading}
        className="hidden"
        id="cloudshare-file-input"
      />

      {/* Drag & Drop Zone or Selected File View */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
              : 'border-slate-200 bg-slate-50/50 hover:border-sky-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-sky-600 mb-2">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            PDF, PNG, JPG, MP4, ZIP, Office docs, code, and more (up to 50 MB)
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 border border-sky-100 shadow-sm">
                <FileIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formatByteSize(selectedFile.size)} &bull; {selectedFile.type || 'unknown type'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
                disabled={isUploading}
              >
                Change
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleInitiateUpload()}
                disabled={isUploading}
                className="gap-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Truthful Uploading Status Indicator */}
          {isUploading && (
            <div className="flex items-center gap-2 rounded-lg bg-sky-100/80 px-3 py-2 text-xs font-medium text-sky-900 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-700" />
              <span className="truncate">{uploadStatus || 'Uploading file to storage bucket...'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
