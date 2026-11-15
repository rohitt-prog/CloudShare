import React, { useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  List,
  LayoutGrid,
  Copy,
  LogOut,
  HardDrive,
  Clock,
  Shield,
  Loader2,
  Check,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/app/providers';
import { useToast } from '@/app/providers/useToast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { VIEW_MODE_STORAGE_KEY } from '@/features/files/components/FileList';
import { parseTimestampSafe } from '@/features/files/types';
import { cn } from '@/utils/cn';

export const SettingsPage: React.FC = () => {
  const { user, session, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  // View Mode Preference state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'grid' || saved === 'list') {
        return saved;
      }
    } catch {
      // Storage restricted environments
    }
    return 'list';
  });

  // Sign out modal state
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Compute user initials for avatar
  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const parts = user.fullName.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length > 0) {
        return parts[0][0].toUpperCase();
      }
    }
    if (user?.email && user.email.length > 0) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }, [user?.fullName, user?.email]);

  // Format member since date safely
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

  // Format session expiration date safely
  const sessionExpiration = useMemo(() => {
    if (!session?.expires_at || typeof session.expires_at !== 'number' || isNaN(session.expires_at)) {
      return 'Not available';
    }
    const date = new Date(session.expires_at * 1000);
    if (isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [session?.expires_at]);

  // Format last sign in date safely
  const lastSignIn = useMemo(() => {
    if (!session?.user?.last_sign_in_at) return 'Current session';
    const timestamp = parseTimestampSafe(session.user.last_sign_in_at);
    if (!timestamp) return 'Current session';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [session?.user?.last_sign_in_at]);

  // Handle view mode change
  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      toast.info(`Default vault view set to ${mode === 'list' ? 'List' : 'Grid'}.`, 'Preference Saved');
    } catch {
      // Storage failure handling
    }
  };

  // Handle UUID copy
  const handleCopyUUID = async () => {
    if (!user?.id) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast.error('Clipboard access is not supported in this browser.', 'Copy Failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success('Account identifier copied to clipboard.', 'Copied');
    } catch {
      toast.error('Unable to copy account identifier to clipboard.', 'Copy Failed');
    }
  };

  // Handle confirmed sign out
  const handleConfirmSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setIsSignOutModalOpen(false);
    }
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Clean and bright default look',
      icon: <Sun className="h-5 w-5 text-amber-500" />,
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Easy on the eyes in low-light environments',
      icon: <Moon className="h-5 w-5 text-indigo-400" />,
    },
    {
      value: 'system' as const,
      label: 'System',
      description: 'Automatically syncs with your device preference',
      icon: <Laptop className="h-5 w-5 text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Settings & Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your appearance, vault preferences and account information.
        </p>
      </div>

      <div className="space-y-8">
        {/* A. Appearance Settings */}
        <section aria-labelledby="appearance-settings-heading">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="appearance-settings-heading" className="text-base font-semibold text-foreground">
                Appearance
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Choose how CloudShare looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div
                role="group"
                aria-label="Theme selection"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
              >
                {themeOptions.map((opt) => {
                  const isSelected = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        'flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.99] motion-reduce:active:scale-100 relative select-none',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        isSelected
                          ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30 shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground hover:scale-[1.015] hover:-translate-y-px motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0'
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card border border-border/60 shadow-xs">
                          {opt.icon}
                        </div>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* B. Vault Preferences */}
        <section aria-labelledby="vault-preferences-heading">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="vault-preferences-heading" className="text-base font-semibold text-foreground">
                Vault Preferences
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Configure your default file viewing experience in the File Vault.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Default File View</p>
                  <p className="text-xs text-muted-foreground">
                    Choose whether the File Vault opens in list or grid layout by default.
                  </p>
                </div>
                <div
                  role="group"
                  aria-label="Default file view preference"
                  className="inline-flex rounded-xl border border-border bg-muted/40 p-1 self-start sm:self-auto"
                >
                  <button
                    type="button"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => handleViewModeChange('list')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 motion-reduce:active:scale-100',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      viewMode === 'list'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List View</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => handleViewModeChange('grid')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 motion-reduce:active:scale-100',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      viewMode === 'grid'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Grid View</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* C. Account Identity */}
        <section aria-labelledby="account-identity-heading">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="account-identity-heading" className="text-base font-semibold text-foreground">
                Account Identity
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Your authenticated CloudShare profile and identifier.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* User Avatar & Core Details */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg border border-primary/20 shadow-xs">
                  {userInitials}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-foreground truncate">
                      {user?.fullName || 'CloudShare User'}
                    </p>
                    <Badge variant="outline" className="text-[10px] py-0 px-2 h-4.5 border-border">
                      Personal Vault
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {user?.email || 'No email associated'}
                  </p>
                </div>
              </div>

              {/* Account Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                {/* Account UUID */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Account Identifier (UUID)</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/80 truncate max-w-full select-all">
                      {user?.id || '—'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyUUID()}
                      aria-label="Copy account identifier"
                      className="shrink-0 h-8 gap-1.5 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>

                {/* Member Since */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Member Since</p>
                  <div className="flex items-center gap-2 py-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{memberSince}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* D. Storage & Vault Information */}
        <section aria-labelledby="storage-info-heading">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="storage-info-heading" className="text-base font-semibold text-foreground">
                Storage & Limits
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Technical limits and storage architecture for your personal vault.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-primary">
                    <HardDrive className="h-4 w-4" />
                    <p className="text-xs font-semibold text-foreground">Upload Size Limit</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">50 MiB per file</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This limit applies to each individual file upload. It is a per-file ingestion threshold, not an overall account capacity limit.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                    <Shield className="h-4 w-4" />
                    <p className="text-xs font-semibold text-foreground">Storage Architecture</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">Private Object Storage</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Files are stored in a private cloud storage bucket. Access is controlled through authenticated ownership policies and CloudShare&apos;s share-link flow.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* E. Session Overview */}
        <section aria-labelledby="session-overview-heading">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle id="session-overview-heading" className="text-base font-semibold text-foreground">
                Active Session
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Current authentication session details and sign out.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Session Status</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-foreground">Active Session</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Session Expiration</p>
                  <p className="text-xs font-semibold text-foreground">{sessionExpiration}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Last Sign In</p>
                  <p className="text-xs font-semibold text-foreground">{lastSignIn}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">Sign out of CloudShare</p>
                  <p className="text-[11px] text-muted-foreground">
                    End your active session on this device. You will need your credentials to sign back in.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 shrink-0 text-xs shadow-xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out of session</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => !isSigningOut && setIsSignOutModalOpen(false)}
        title="Confirm Sign Out"
        description="Are you sure you want to end your active session?"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Signing out will disconnect your active session on this device. Any unsaved actions will be interrupted.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSignOutModalOpen(false)}
              disabled={isSigningOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleConfirmSignOut()}
              disabled={isSigningOut}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
