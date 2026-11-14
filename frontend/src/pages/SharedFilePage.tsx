import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  Clock,
  HardDrive,
  FileText,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shareService } from '@/features/sharing/services/share.service';
import type { SharedFileMetadata } from '@/features/sharing/types';

export interface SharedFilePageProps {
  token: string;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

export const SharedFilePage: React.FC<SharedFilePageProps> = ({
  token,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const [metadata, setMetadata] = useState<SharedFileMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch shared file metadata on load
  useEffect(() => {
    let isCancelled = false;

    async function loadMetadata() {
      setIsLoading(true);
      setError(null);

      const result = await shareService.getSharedFileMetadata(token);

      if (!isCancelled) {
        setIsLoading(false);
        if (result.success) {
          setMetadata(result.metadata);
        } else {
          setError(result.error);
        }
      }
    }

    if (token) {
      void loadMetadata();
    } else {
      setIsLoading(false);
      setError('Missing share token in URL.');
    }

    return () => {
      isCancelled = true;
    };
  }, [token]);

  // Handle file download
  const handleDownload = useCallback(async () => {
    if (!token || !metadata) return;

    setIsDownloading(true);
    setDownloadError(null);

    const result = await shareService.getSharedFileDownloadUrl(token);
    setIsDownloading(false);

    if (result.success) {
      // Trigger browser download via signed URL
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName || metadata.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setDownloadError(result.error);
    }
  }, [token, metadata]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center space-y-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-sm animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-800">Verifying secure share link...</h2>
          <p className="text-xs text-slate-400">Validating cryptographic token and permissions</p>
        </div>
      </div>
    );
  }

  // 2. Error / Expired / Invalid State
  if (error || !metadata) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Link Expired or Unavailable</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error || 'This link is invalid, has expired, or was revoked by the file owner.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Time-limited links are automatically invalidated upon expiration</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="primary" size="sm" onClick={onNavigateToHome} className="w-full sm:w-auto">
              Go to CloudShare Home
            </Button>
            <Button variant="outline" size="sm" onClick={onNavigateToLogin} className="w-full sm:w-auto">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Valid Shared File View
  const formattedExpiry = new Date(metadata.expiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
      {/* Brand & Security Notice */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 border border-sky-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>CloudShare Secure Guest Portal</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">File Shared With You</h1>
        <p className="text-xs text-slate-500">
          You have been granted temporary access to view and download this file
        </p>
      </div>

      {/* Main Shared File Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <FileText className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-900" title={metadata.fileName}>
              {metadata.fileName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-mono text-slate-600">
                <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                {metadata.formattedSize}
              </span>
              <span>&bull;</span>
              <span className="truncate max-w-[150px] text-slate-400" title={metadata.mimeType}>
                {metadata.mimeType}
              </span>
            </div>
          </div>
        </div>

        {/* Expiration Notice */}
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-800">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Access Expiration</p>
            <p className="text-[11px] text-amber-700">Valid until {formattedExpiry}</p>
          </div>
        </div>

        {/* Download Error Banner */}
        {downloadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p>{downloadError}</p>
          </div>
        )}

        {/* Download Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="w-full gap-2 text-sm shadow-md shadow-sky-600/10"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isDownloading ? 'Generating Secure Download...' : 'Download File'}</span>
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            <span>Generates an encrypted 60-second direct download tunnel</span>
          </p>
        </div>
      </div>

      {/* CloudShare Promotion / Navigation */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs">
        <div>
          <p className="font-semibold text-slate-800">Want your own secure cloud vault?</p>
          <p className="text-[11px] text-slate-500">Store and share files with granular permissions.</p>
        </div>
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
        >
          <span>Sign In</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
