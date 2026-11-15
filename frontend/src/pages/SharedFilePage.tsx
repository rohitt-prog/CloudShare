import React, { useEffect, useState, useCallback } from 'react';
import {
  Cloud,
  ShieldCheck,
  Download,
  Clock,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  File,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/app/providers';
import { useToast } from '@/app/providers/useToast';
import { shareService } from '@/features/sharing/services/share.service';
import type { SharedFileMetadata } from '@/features/sharing/types';
import { determineFileCategory, type FileCategory } from '@/features/files/types';
import { cn } from '@/utils/cn';

export interface SharedFilePageProps {
  token: string;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const CategoryIcon: React.FC<{ category: FileCategory; className?: string }> = ({
  category,
  className = 'h-7 w-7',
}) => {
  switch (category) {
    case 'documents':
      return <FileText className={cn('text-indigo-500 dark:text-indigo-400', className)} />;
    case 'images':
      return <ImageIcon className={cn('text-sky-500 dark:text-sky-400', className)} />;
    case 'media':
      return <Film className={cn('text-purple-500 dark:text-purple-400', className)} />;
    case 'archives':
      return <Archive className={cn('text-amber-500 dark:text-amber-400', className)} />;
    case 'other':
    default:
      return <File className={cn('text-muted-foreground', className)} />;
  }
};

export const SharedFilePage: React.FC<SharedFilePageProps> = ({
  token,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { theme, setTheme } = useTheme();
  const toast = useToast();

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
    if (!token || !metadata || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await shareService.getSharedFileDownloadUrl(token);

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
        toast.info('Download initiated in your browser.', 'Download');
      } else {
        setDownloadError(result.error);
        toast.error(result.error || 'Failed to generate download URL.', 'Download Failed');
      }
    } catch {
      const fallbackError = 'An unexpected error occurred while preparing your download. Please try again.';
      setDownloadError(fallbackError);
      toast.error(fallbackError, 'Download Failed');
    } finally {
      setIsDownloading(false);
    }
  }, [token, metadata, isDownloading, toast]);

  const fileCategory = metadata
    ? determineFileCategory(metadata.mimeType, metadata.fileName)
    : 'other';

  const formattedExpiry = metadata
    ? new Date(metadata.expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Restrained Guest Header with Branding and Theme Selector */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Cloud className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">CloudShare</span>
          </div>

          {/* Accessible Segmented Theme Selector */}
          <div
            role="group"
            aria-label="Theme selection"
            className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              aria-label="Light theme"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                theme === 'light'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              aria-label="Dark theme"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                theme === 'dark'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              aria-pressed={theme === 'system'}
              aria-label="System theme"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                theme === 'system'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">System</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Landmark */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* 1. Loading State */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-lg space-y-4"
          >
            <Card className="p-8 text-center space-y-6 border-border bg-card shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>

              <div className="space-y-2">
                <h1 className="text-lg font-bold text-foreground">Checking shared link...</h1>
                <p className="text-xs text-muted-foreground">
                  Verifying cryptographic permissions and file availability
                </p>
              </div>

              {/* Skeleton placeholders mirroring card dimensions */}
              <div className="space-y-3 pt-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </Card>
          </div>
        )}

        {/* 2. Error / Expired / Revoked / Unavailable State */}
        {!isLoading && (error || !metadata) && (
          <div
            role="region"
            aria-label="Shared file unavailable"
            className="w-full max-w-md space-y-4"
          >
            <Card className="p-8 text-center space-y-6 border-border bg-card shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h1 className="text-lg font-bold text-foreground">Link Unavailable or Expired</h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {error || 'This link is invalid, has expired, or was revoked by the file owner.'}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center justify-center gap-2">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Time-limited links automatically expire and cannot be accessed once invalidated</span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onNavigateToHome}
                  className="w-full sm:w-auto"
                >
                  Go to CloudShare Home
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToLogin}
                  className="w-full sm:w-auto"
                >
                  Sign In
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 3. Valid Shared File View */}
        {!isLoading && metadata && (
          <div className="w-full max-w-lg space-y-6 animate-in fade-in duration-200">
            {/* Header Badge & Title */}
            <div className="text-center space-y-2">
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CloudShare Secure Guest Portal</span>
              </Badge>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                File Shared With You
              </h1>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You have been granted temporary access to view metadata and download this file.
              </p>
            </div>

            {/* Main Shared File Card */}
            <Card className="p-6 sm:p-8 space-y-6 border-border bg-card shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <CategoryIcon category={fileCategory} className="h-7 w-7" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h2
                    className="text-base sm:text-lg font-semibold text-foreground truncate"
                    title={metadata.fileName}
                  >
                    {metadata.fileName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1 font-mono text-foreground font-medium">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      {metadata.formattedSize}
                    </span>
                    <span>&bull;</span>
                    <span
                      className="truncate max-w-[180px] font-mono text-[11px]"
                      title={metadata.mimeType}
                    >
                      {metadata.mimeType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Temporary Access Expiration Notice */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Temporary Access Expiration</p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                    This link is valid until {formattedExpiry}. Access will automatically terminate after expiration.
                  </p>
                </div>
              </div>

              {/* Download Error Banner */}
              {downloadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="leading-relaxed">{downloadError}</p>
                </div>
              )}

              {/* Download Action */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void handleDownload()}
                  disabled={isDownloading}
                  className="w-full gap-2 text-sm shadow-sm font-semibold"
                  aria-label={isDownloading ? 'Preparing secure download' : `Download ${metadata.fileName}`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Initiating Download...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download File</span>
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  <span>Generates a temporary signed direct download URL</span>
                </p>
              </div>
            </Card>

            {/* CloudShare Promotion / Value Prop */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4 text-xs">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-semibold text-foreground">Need your own cloud vault?</p>
                <p className="text-[11px] text-muted-foreground">Store files securely and share with granular permissions.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNavigateToLogin}
                className="shrink-0 gap-1 text-xs"
              >
                <span>Sign In</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Restrained Guest Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} CloudShare. Temporary guest file sharing.</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={onNavigateToHome}
              className="hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
            >
              Home
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
