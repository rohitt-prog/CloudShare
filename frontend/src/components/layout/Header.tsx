import React, { useState, useContext } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  LogOut,
  Check,
  ChevronDown,
  Loader2,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/app/providers';
import { RouterContext } from '@/app/router-context';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/utils/cn';

export interface HeaderProps {
  onOpenMobileNav?: () => void;
  isMobileNavOpen?: boolean;
  mobileNavTriggerRef?: React.RefObject<HTMLButtonElement>;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  isMobileNavOpen = false,
  mobileNavTriggerRef,
}) => {
  const router = useContext(RouterContext);
  const currentRoute = router?.currentRoute ?? 'home';
  const { isAuthenticated, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const title =
    currentRoute === 'settings'
      ? 'Settings'
      : currentRoute === 'dashboard' ? 'Dashboard' : 'File Vault';
  const subtitle =
    currentRoute === 'settings'
      ? 'Manage preferences and account information'
      : currentRoute === 'dashboard'
      ? 'Storage and activity overview'
      : 'Manage and share your secure files';

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: Mobile Nav Button & Workspace Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          ref={mobileNavTriggerRef}
          type="button"
          id="mobile-nav-trigger"
          onClick={onOpenMobileNav}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-navigation-drawer"
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="md:hidden -ml-1 mr-1 rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
              {title}
            </h2>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[10px] font-normal py-0 px-2 h-5 text-muted-foreground border-border"
            >
              Personal
            </Badge>
          </div>
          <p className="hidden md:block text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Theme Selector & User Account */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95 hover:border-border transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 border border-border/50"
            aria-label={`Theme selector, current theme is ${theme}`}
          >
            {theme === 'light' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : theme === 'dark' ? (
              <Moon className="h-4 w-4 text-indigo-400" />
            ) : (
              <Laptop className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="right" className="w-36">
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className={cn(
                'flex items-center justify-between',
                theme === 'light' && 'font-semibold text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className={cn(
                'flex items-center justify-between',
                theme === 'dark' && 'font-semibold text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className={cn(
                'flex items-center justify-between',
                theme === 'system' && 'font-semibold text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-muted-foreground" />
                <span>System</span>
              </div>
              {theme === 'system' && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Account Dropdown */}
        {isAuthenticated && user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-accent hover:scale-[1.015] active:scale-[0.98] hover:border-border transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 border border-border/50"
              aria-label={`User account menu for ${user.fullName || user.email}`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                {userInitials}
              </div>
              <span className="hidden lg:block max-w-[120px] truncate text-xs font-medium text-foreground">
                {user.fullName || user.email.split('@')[0]}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="right" className="w-56 p-2">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.fullName || 'CloudShare User'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router?.navigate('settings')}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/30"
              >
                {isSigningOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                ) : (
                  <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
