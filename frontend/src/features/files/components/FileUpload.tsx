import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from './FileCard';
import { validateFileForUpload, formatByteSize, determineFileCategory } from '@/features/files/types';
import { useToast } from '@/app/providers/useToast';
import { cn } from '@/utils/cn';

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
  const toast = useToast();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback(
    (file: File | null) => {
      onClearError();

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

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);
        const primaryFile = fileList[0];
        const extraCount = fileList.length - 1;

        if (extraCount > 0) {
          toast.warning(
            `Selected "${primaryFile.name}". ${extraCount} additional file${
              extraCount > 1 ? 's were' : ' was'
            } ignored because single-file upload is currently enabled.`,
            'Single File Upload'
          );
        }

        handleFileSelection(primaryFile);
      }
    },
    [handleFileSelection, toast]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      const primaryFile = fileList[0];
      const extraCount = fileList.length - 1;

      if (extraCount > 0) {
        toast.warning(
          `Selected "${primaryFile.name}". ${extraCount} additional file${
            extraCount > 1 ? 's were' : ' was'
          } ignored because single-file upload is currently enabled.`,
          'Single File Upload'
        );
      }

      handleFileSelection(primaryFile);
    }
  };

  const handleInitiateUpload = async () => {
    if (!selectedFile || isUploading) return;

    const uploadedFileName = selectedFile.name;
    const result = await onUpload(selectedFile);
    if (result.success) {
      toast.success(`"${uploadedFileName}" uploaded successfully to your vault.`, 'Upload Complete');
      setSelectedFile(null);
      setValidationError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    onClearError();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedCategory = selectedFile
    ? determineFileCategory(selectedFile.type || null, selectedFile.name)
    : 'other';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Upload to Private Vault</h2>
            <p className="text-xs text-muted-foreground">Max file size: 50 MB &bull; Encrypted storage</p>
          </div>
        </div>
        {selectedFile && !isUploading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelSelection}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel file selection"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-fadeIn"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <span className="leading-relaxed">{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-destructive/80 hover:text-destructive hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss validation error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-fadeIn"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Upload Failed</p>
              <p className="text-foreground/80 leading-relaxed">{uploadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-destructive/80 hover:text-destructive hover:scale-110 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss upload error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hidden Native File Input with Accessibility Attributes */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleChange}
        disabled={isUploading}
        className="sr-only"
        id="cloudshare-file-input"
        aria-label="Choose file to upload"
        tabIndex={-1}
      />

      {/* Accessible Interactive Dropzone OR Selected File Preview */}
      {!selectedFile ? (
        <button
          type="button"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload file: drop file here or click to browse"
          className={cn(
            'group relative flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-150 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            dragActive
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-border/80 bg-accent/20 hover:border-primary/50 hover:bg-accent/40'
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm border border-border text-primary mb-2 group-hover:scale-105 transition-transform motion-reduce:group-hover:scale-100">
            <UploadCloud className="h-6 w-6" />
          </span>
          <span className="block text-xs font-semibold text-foreground">
            Click to upload <span className="font-normal text-muted-foreground">or drag and drop</span>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            PDF, documents, images, video, archives, and code (up to 50 MB)
          </span>
          <span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs group-hover:border-primary/40 group-hover:bg-accent transition-colors">
            Browse files
          </span>
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                <CategoryIcon category={selectedCategory} className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-bold text-foreground" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <Badge variant="outline" size="sm" className="capitalize text-[10px] shrink-0">
                    {selectedCategory}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {formatByteSize(selectedFile.size)} &bull; {selectedFile.type || 'unknown format'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
                disabled={isUploading}
                className="text-xs"
              >
                Change
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleInitiateUpload()}
                disabled={isUploading}
                className="gap-1.5 text-xs shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload File</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Indeterminate Truthful Upload Progress Indicator */}
          {isUploading && (
            <div
              role="status"
              aria-live="polite"
              className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                <span className="truncate">{uploadStatus || `Uploading ${selectedFile.name}...`}</span>
              </div>
              {/* Indeterminate loading bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
