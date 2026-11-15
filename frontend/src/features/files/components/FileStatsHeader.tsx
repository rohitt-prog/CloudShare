import React from 'react';
import { Files, HardDrive, Layers, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { FileStats } from '@/features/files/types';

export interface FileStatsHeaderProps {
  stats: FileStats;
  isTableMissing?: boolean;
}

export const FileStatsHeader: React.FC<FileStatsHeaderProps> = ({
  stats,
  isTableMissing = false,
}) => {
  const activeCategoryCount = Object.entries(stats.categoryCounts).filter(
    ([key, count]) => key !== 'all' && count > 0
  ).length;

  return (
    <div className="space-y-4">
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
              has not yet been deployed to your remote project. CloudShare is presenting local preview metadata so search,
              sorting, filtering, and inspection can be tested interactively.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Files Card */}
        <Card className="flex items-center gap-4 p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Files className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalFiles}</p>
          </div>
        </Card>

        {/* Total Storage Used Card */}
        <Card className="flex items-center gap-4 p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Storage Used</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stats.formattedTotalSize}</p>
          </div>
        </Card>

        {/* Categories Represented Card */}
        <Card className="flex items-center gap-4 p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">File Categories</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{activeCategoryCount}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
