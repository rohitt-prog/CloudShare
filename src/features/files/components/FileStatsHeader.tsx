import React from 'react';
import { Files, HardDrive, Layers, Info } from 'lucide-react';
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
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900"
        >
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Demo Metadata Mode (Undeployed Database Migration)
            </p>
            <p className="text-amber-800 leading-relaxed">
              The Supabase <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">public.files</code> table
              has not yet been deployed to your remote project. CloudShare is presenting local preview metadata so search,
              sorting, filtering, and inspection can be tested interactively.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Files Card */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Files className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Files</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalFiles}</p>
          </div>
        </div>

        {/* Total Storage Used Card */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Storage Used</p>
            <p className="text-2xl font-bold text-slate-900">{stats.formattedTotalSize}</p>
          </div>
        </div>

        {/* Categories Represented Card */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">File Categories</p>
            <p className="text-2xl font-bold text-slate-900">{activeCategoryCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
