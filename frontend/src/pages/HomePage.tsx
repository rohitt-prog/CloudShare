import React from 'react';
import { Layers, CheckCircle2, UserCheck } from 'lucide-react';
import { CURRENT_PHASE } from '@/constants';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FileList } from '@/features/files/components/FileList';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Dashboard Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2.5 text-sky-700">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">File Vault</h1>
              <p className="text-xs text-slate-500">{CURRENT_PHASE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Auth Verified
            </span>
          </div>
        </div>

        {user && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{user.email}</p>
                <p className="font-mono text-[10px] text-slate-500">Owner ID: {user.id}</p>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              All queries scoped strictly to <code className="font-mono text-slate-700">auth.uid()</code>
            </div>
          </div>
        )}
      </div>

      {/* Main File Management Section */}
      <FileList />
    </div>
  );
};
