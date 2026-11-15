import React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 ease-out hover:scale-[1.015] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 disabled:active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:hover:scale-100 aria-disabled:hover:translate-y-0 select-none';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 dark:hover:shadow-primary/25 focus-visible:ring-ring shadow-xs',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-xs focus-visible:ring-ring',
      outline:
        'border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground hover:border-border/80 hover:shadow-xs focus-visible:ring-ring shadow-xs',
      ghost:
        'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-none focus-visible:ring-ring',
      destructive:
        'border border-rose-300 dark:border-rose-500/40 bg-card dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-500 dark:hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:shadow-xs hover:shadow-rose-500/20 active:scale-[0.98] focus-visible:ring-rose-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
