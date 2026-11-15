import React from 'react';
import {
  Cloud,
  Folder,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '@/app/router-context';
import { NavigationItem } from './NavigationItem';
import { cn } from '@/utils/cn';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { currentRoute, navigate } = useRouter();

  return (
    <aside
      aria-label="Application Sidebar"
      className={cn(
        'hidden md:flex flex-col justify-between h-screen h-[100dvh] border-r border-border bg-card text-card-foreground select-none transition-all duration-200 ease-in-out shrink-0',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col">
        <div className={cn('flex items-center h-16 border-b border-border px-3', isCollapsed ? 'justify-center' : 'justify-start gap-3')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Cloud className="h-5 w-5" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
                CloudShare
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">
                Secure Cloud Storage
              </p>
            </div>
          )}
        </div>

        {/* Primary Navigation Destinations */}
        <nav aria-label="Main Navigation" className="space-y-1.5 p-2 pt-4">
          <NavigationItem
            label="File Vault"
            icon={<Folder className="h-4 w-4" />}
            isActive={currentRoute === 'home' || currentRoute === undefined}
            onClick={() => navigate('home')}
            isCollapsed={isCollapsed}
            ariaLabel="Navigate to File Vault"
          />

          <NavigationItem
            label="Dashboard"
            icon={<LayoutDashboard className="h-4 w-4" />}
            isActive={currentRoute === 'dashboard'}
            onClick={() => navigate('dashboard')}
            isCollapsed={isCollapsed}
            ariaLabel="Navigate to Dashboard"
          />

          <NavigationItem
            label="Settings"
            icon={<Settings className="h-4 w-4" />}
            isActive={currentRoute === 'settings'}
            onClick={() => navigate('settings')}
            isCollapsed={isCollapsed}
            ariaLabel="Navigate to Settings"
          />
        </nav>
      </div>

      {/* Bottom Footer & Collapse Toggle */}
      <div className="p-2 border-t border-border">
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center rounded-xl p-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.98] motion-reduce:active:scale-100 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none w-full',
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          )}
        >
          {!isCollapsed && <span>Collapse sidebar</span>}
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronLeft className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
};
