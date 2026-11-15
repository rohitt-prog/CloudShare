import React, { useEffect, useRef } from 'react';
import {
  Cloud,
  Folder,
  LayoutDashboard,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { useRouter } from '@/app/router-context';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NavigationItem } from './NavigationItem';

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { currentRoute, navigate } = useRouter();
  const { user, signOut } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management, escape dismissal, keyboard trap, and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element and active element prior to opening
    const triggerElement = triggerRef?.current;
    const fallbackActiveElement = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus to the close button (or first focusable element)
    const focusTimer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (drawerRef.current) {
        const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        firstFocusable?.focus();
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
          )
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus to trigger button or previous element
      setTimeout(() => {
        const targetToFocus =
          triggerElement && document.contains(triggerElement)
            ? triggerElement
            : fallbackActiveElement && document.contains(fallbackActiveElement)
            ? fallbackActiveElement
            : (document.getElementById('mobile-nav-trigger') as HTMLElement | null);

        if (targetToFocus && typeof targetToFocus.focus === 'function') {
          targetToFocus.focus();
        }
      }, 0);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleNavigate = (route: 'home' | 'dashboard' | 'settings') => {
    navigate(route);
    onClose();
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      onClick={onClose}
      className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-sm animate-fadeIn motion-reduce:animate-none"
    >
      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        onClick={(e) => e.stopPropagation()}
        className="relative w-72 max-w-[80vw] h-full bg-card text-card-foreground border-r border-border shadow-2xl p-4 flex flex-col justify-between animate-slideInLeft motion-reduce:animate-none"
      >
        {/* Top Header & Brand */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  CloudShare
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  Secure Vault
                </p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close navigation drawer"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Mobile Drawer Navigation" className="space-y-1.5">
            <NavigationItem
              label="File Vault"
              icon={<Folder className="h-4 w-4" />}
              isActive={currentRoute === 'home' || currentRoute === undefined}
              onClick={() => handleNavigate('home')}
              ariaLabel="Navigate to File Vault"
            />

            <NavigationItem
              label="Dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              isActive={currentRoute === 'dashboard'}
              onClick={() => handleNavigate('dashboard')}
              ariaLabel="Navigate to Dashboard"
            />

            <NavigationItem
              label="Settings"
              icon={<Settings className="h-4 w-4" />}
              isActive={currentRoute === 'settings'}
              onClick={() => handleNavigate('settings')}
              ariaLabel="Navigate to Settings"
            />
          </nav>
        </div>

        {/* Bottom User Profile & Sign-Out */}
        {user && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2.5 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                {user.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : (user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.fullName || user.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
