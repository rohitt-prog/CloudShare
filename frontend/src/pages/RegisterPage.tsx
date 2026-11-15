import React from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { APP_NAME } from '@/constants';

export interface RegisterPageProps {
  onNavigateToLogin?: () => void;
  onSuccess?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin, onSuccess }) => {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background text-foreground animate-fadeIn motion-reduce:animate-none">
      <div className="w-full max-w-md space-y-6 animate-slideInUp motion-reduce:animate-none">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform duration-200 hover:scale-105 motion-reduce:hover:scale-100">
            <Cloud className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Create your {APP_NAME} account
          </h2>
          <p className="text-xs text-muted-foreground">
            Get started with secure, private cloud storage and encrypted sharing
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-lg shadow-black/5 dark:shadow-black/30">
          <RegisterForm onNavigateToLogin={onNavigateToLogin} onSuccess={onSuccess} />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Zero-knowledge client isolation and private storage</span>
        </div>
      </div>
    </div>
  );
};
