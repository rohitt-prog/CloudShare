import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'cloudshare-sidebar-collapsed';

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);

  // Synchronize sidebar collapsed preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // Gracefully handle storage quota or privacy mode errors
    }
  }, [isSidebarCollapsed]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Mobile Drawer Navigation */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        triggerRef={mobileNavTriggerRef}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* Top SaaS Header */}
        <Header
          onOpenMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          isMobileNavOpen={isMobileNavOpen}
          mobileNavTriggerRef={mobileNavTriggerRef}
        />

        {/* Primary Content Container */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
