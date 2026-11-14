import React from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { APP_NAME } from '@/constants';

export interface LoginPageProps {
  onNavigateToRegister?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister, onSuccess }) => {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
            <Cloud className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to {APP_NAME}
          </h2>
          <p className="text-xs text-slate-500">
            Access your encrypted cloud vault and shared files securely
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <LoginForm onNavigateToRegister={onNavigateToRegister} onSuccess={onSuccess} />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Protected by Supabase Auth with Row Level Security</span>
        </div>
      </div>
    </div>
  );
};
