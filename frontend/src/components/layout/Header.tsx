import React, { useState } from 'react';
import { Cloud, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { APP_NAME } from '@/constants';

export const Header: React.FC = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-200">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
            <p className="text-xs text-slate-500">Secure Cloud File Sharing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <UserIcon className="h-3 w-3" />
                </div>
                <span className="max-w-[180px] truncate">{user.fullName || user.email}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="text-xs gap-1.5 text-slate-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              >
                {isSigningOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span>Phase 3 &mdash; Auth Ready</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
