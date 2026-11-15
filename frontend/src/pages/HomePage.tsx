import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FileList } from '@/features/files/components/FileList';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">All Files</h1>
          <p className="text-sm text-muted-foreground">
            Manage, upload, preview, and share your cloud files securely.
          </p>
        </div>
        {user && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground self-start sm:self-auto shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-mono text-[11px] text-foreground">{user.email}</span>
          </div>
        )}
      </div>

      {/* Main File Management Section */}
      <FileList />
    </div>
  );
};
