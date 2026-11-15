import React from 'react';
import { cn } from '@/utils/cn';

export interface NavigationItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
  badge?: React.ReactNode;
  ariaLabel?: string;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  label,
  icon,
  isActive,
  onClick,
  isCollapsed = false,
  badge,
  ariaLabel,
}) => {
  if (isCollapsed) {
    return (
      <button
        type="button"
        title={label}
        aria-label={ariaLabel || label}
        aria-current={isActive ? 'page' : undefined}
        onClick={onClick}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl mx-auto transition-all duration-150 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isActive
            ? 'bg-primary/15 text-primary dark:bg-primary/25 font-semibold'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <span className="shrink-0">{icon}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel || label}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-left',
        isActive
          ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn('shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      {badge && <span className="shrink-0">{badge}</span>}
    </button>
  );
};
