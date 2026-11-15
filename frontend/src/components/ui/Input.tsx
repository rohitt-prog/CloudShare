import React, { useId } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, rightElement, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'block w-full rounded-xl border bg-background px-3.5 py-2 text-sm text-foreground transition-all duration-150',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/30 text-destructive'
                : 'border-input hover:border-border focus:border-primary focus:ring-primary/20',
              rightElement ? 'pr-10' : '',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-destructive animate-fadeIn motion-reduce:animate-none">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
