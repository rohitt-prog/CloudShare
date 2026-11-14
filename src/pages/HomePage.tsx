import React from 'react';
import { Cloud, Lock, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';
import { CURRENT_PHASE } from '@/constants';

export const HomePage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Project Status</h2>
              <p className="text-sm text-slate-500">{CURRENT_PHASE}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Backend Foundation Ready
          </span>
        </div>

        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed">
            Welcome to <strong className="text-slate-900">CloudShare</strong>. The frontend has been reorganized
            into a scalable, domain-driven feature architecture with isolated modules for authentication, file management,
            and secure link sharing. Backend isolation boundaries have been established in the separate Supabase directory.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sky-600">
                <Layers className="h-5 w-5" />
                <h3 className="font-medium text-slate-800">Feature Architecture</h3>
              </div>
              <p className="text-xs text-slate-500">Domain-isolated modules (`auth`, `files`, `sharing`)</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-600">
                <Lock className="h-5 w-5" />
                <h3 className="font-medium text-slate-800">Security Boundary</h3>
              </div>
              <p className="text-xs text-slate-500">Supabase RLS & Edge Functions protect private storage</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-indigo-600">
                <Cloud className="h-5 w-5" />
                <h3 className="font-medium text-slate-800">Backend Ready</h3>
              </div>
              <p className="text-xs text-slate-500">Separated `supabase/` migrations and Edge Functions</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Zero Leakage Verification: Service role keys are restricted strictly to Supabase server environments.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
