import React from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/constants';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-200">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
            <p className="text-xs text-slate-500">Secure Cloud File Sharing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Architecture Ready</span>
        </div>
      </div>
    </header>
  );
};
