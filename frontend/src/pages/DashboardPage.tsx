import React, { useMemo } from 'react';
import {
  Files,
  HardDrive,
  Layers,
  Calendar,
  Folder,
  ArrowRight,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  File,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRouter } from '@/app/router-context';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFiles } from '@/features/files/hooks/useFiles';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatByteSize,
  parseTimestampSafe,
  type FileCategory,
} from '@/features/files/types';
import { cn } from '@/utils/cn';

/**
 * Category metadata definitions for visual representation
 */
const CATEGORIES: Array<{
  key: Exclude<FileCategory, 'all'>;
  label: string;
  colorClass: string;
  barColorClass: string;
}> = [
  {
    key: 'documents',
    label: 'Documents',
    colorClass: 'text-indigo-500 dark:text-indigo-400',
    barColorClass: 'bg-indigo-500 dark:bg-indigo-400',
  },
  {
    key: 'images',
    label: 'Images',
    colorClass: 'text-sky-500 dark:text-sky-400',
    barColorClass: 'bg-sky-500 dark:bg-sky-400',
  },
  {
    key: 'media',
    label: 'Media',
    colorClass: 'text-purple-500 dark:text-purple-400',
    barColorClass: 'bg-purple-500 dark:bg-purple-400',
  },
  {
    key: 'archives',
    label: 'Archives',
    colorClass: 'text-amber-500 dark:text-amber-400',
    barColorClass: 'bg-amber-500 dark:bg-amber-400',
  },
  {
    key: 'other',
    label: 'Other',
    colorClass: 'text-muted-foreground',
    barColorClass: 'bg-slate-500 dark:bg-slate-400',
  },
];

/**
 * Render category icon with consistent tokenized colors
 */
const CategoryIcon: React.FC<{ category: FileCategory; className?: string }> = ({
  category,
  className = 'h-4 w-4',
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

export const DashboardPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { allFiles, stats, isLoading, error, isTableMissing } = useFiles();

  // 1. Most active category calculation
  const mostActiveCategory = useMemo(() => {
    if (!allFiles || allFiles.length === 0) {
      return { label: 'None', count: 0 };
    }

    let topCategory: { label: string; count: number } = { label: 'None', count: 0 };

    for (const cat of CATEGORIES) {
      const count = stats.categoryCounts[cat.key] || 0;
      if (count > topCategory.count) {
        topCategory = { label: cat.label, count };
      }
    }

    if (topCategory.count === 0) {
      return { label: 'None', count: 0 };
    }

    return topCategory;
  }, [allFiles, stats.categoryCounts]);

  // 2. Member since formatted date
  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '—';
    const timestamp = parseTimestampSafe(user.createdAt);
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [user?.createdAt]);

  // 3. Category storage breakdown calculation
  const categoryStats = useMemo(() => {
    const bytesByCategory: Record<Exclude<FileCategory, 'all'>, number> = {
      documents: 0,
      images: 0,
      media: 0,
      archives: 0,
      other: 0,
    };

    allFiles.forEach((file) => {
      const cat = file.category;
      if (cat !== 'all' && bytesByCategory[cat] !== undefined) {
        bytesByCategory[cat] += file.fileSize || 0;
      } else {
        bytesByCategory.other += file.fileSize || 0;
      }
    });

    const totalBytes = stats.totalSizeBytes || 0;

    return CATEGORIES.map((cat) => {
      const count = stats.categoryCounts[cat.key] || 0;
      const bytes = bytesByCategory[cat.key] || 0;
      const percentage = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0;

      return {
        ...cat,
        count,
        bytes,
        formattedSize: formatByteSize(bytes),
        percentage: Number(percentage.toFixed(1)),
      };
    });
  }, [allFiles, stats]);

  // 4. Five most recent uploads (newest first)
  const recentFiles = useMemo(() => {
    return [...allFiles]
      .sort((a, b) => {
        const timeA = parseTimestampSafe(a.createdAt);
        const timeB = parseTimestampSafe(b.createdAt);
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [allFiles]);

  return (
    <div className="space-y-8">
      {/* A. Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            High-level overview of your cloud storage, file distribution, and recent uploads.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate('home')}
            className="gap-2 shadow-xs"
            aria-label="Open File Vault"
          >
            <Folder className="h-4 w-4" />
            <span>Open File Vault</span>
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {isTableMissing && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300"
        >
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              Demo Metadata Mode (Undeployed Database Migration)
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              The Supabase <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-[11px]">public.files</code> table
              has not yet been deployed to your remote project. CloudShare is presenting local preview metadata.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to load dashboard data</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* B. Workspace Metrics */}
      <section aria-labelledby="workspace-metrics-heading">
        <h2 id="workspace-metrics-heading" className="sr-only">
          Workspace Metrics
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-live="polite">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Files */}
            <Card className="flex items-center gap-4 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Files className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Total Files</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalFiles}</p>
              </div>
            </Card>

            {/* Storage Used */}
            <Card className="flex items-center gap-4 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Storage Used</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.formattedTotalSize}</p>
              </div>
            </Card>

            {/* Most Active Category */}
            <Card className="flex items-center gap-4 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Layers className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Most Active Category</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-lg font-bold tracking-tight text-foreground truncate">
                    {mostActiveCategory.label}
                  </p>
                  {mostActiveCategory.count > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5 border-border shrink-0">
                      {mostActiveCategory.count}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Member Since */}
            <Card className="flex items-center gap-4 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Member Since</p>
                <p className="text-base font-semibold tracking-tight text-foreground truncate mt-0.5">
                  {memberSince}
                </p>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* C. Category Storage Breakdown */}
        <section aria-labelledby="category-breakdown-heading" className="lg:col-span-5">
          <Card className="h-full flex flex-col shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="category-breakdown-heading" className="text-base font-semibold text-foreground">
                Storage Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Distribution of storage usage across supported file categories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              {isLoading ? (
                <div className="space-y-4" role="status" aria-live="polite">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : allFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 text-muted-foreground">
                  <Layers className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs font-medium text-foreground">No files in your vault yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Upload documents, images, or media to see your storage breakdown across categories.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map((item) => (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon category={item.key} className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium text-foreground truncate">{item.label}</span>
                          <span className="text-[11px] text-muted-foreground">({item.count})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-muted-foreground">{item.formattedSize}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
                            {item.percentage}%
                          </Badge>
                        </div>
                      </div>
                      {/* Visual Category Distribution Bar */}
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(item.percentage)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${item.label} storage usage percentage`}
                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={cn('h-full transition-all duration-300 motion-reduce:duration-0', item.barColorClass)}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* D. Recent Uploads */}
        <section aria-labelledby="recent-uploads-heading" className="lg:col-span-7">
          <Card className="h-full flex flex-col shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
              <div>
                <CardTitle id="recent-uploads-heading" className="text-base font-semibold text-foreground">
                  Recent Uploads
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest additions to your personal cloud vault
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('home')}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                aria-label="View all files in File Vault"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
              {isLoading ? (
                <div className="space-y-3" role="status" aria-live="polite">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No recent files</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Your vault is empty. Upload documents, images, or media to store and manage them securely.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('home')}
                    className="gap-1.5 text-xs mt-2"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload your first file</span>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentFiles.map((file) => {
                    const formattedDate = parseTimestampSafe(file.createdAt)
                      ? new Date(parseTimestampSafe(file.createdAt)).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 border border-border/40">
                            <CategoryIcon category={file.category} className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate" title={file.fileName}>
                              {file.fileName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {file.formattedSize} &bull; {formattedDate}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('home')}
                          className="text-xs shrink-0 h-7 px-2.5 text-muted-foreground hover:text-foreground"
                          aria-label={`View ${file.fileName} in File Vault`}
                        >
                          <span>View in Vault</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* E. Quick Actions Launcher */}
      <section aria-labelledby="quick-actions-heading">
        <Card className="p-5 sm:p-6 bg-card border border-border shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 id="quick-actions-heading" className="text-base font-semibold text-foreground">
                Vault Quick Actions
              </h2>
              <p className="text-xs text-muted-foreground">
                Ready to manage your files? Navigate directly to the vault to upload new assets or manage existing links.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate('home')}
                className="gap-1.5 text-xs shadow-xs"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload a File</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('home')}
                className="gap-1.5 text-xs"
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Open File Vault</span>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
