import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  ToastContext,
  type ToastItem,
  type ToastOptions,
  type ToastType,
  type ToastContextValue,
} from './useToast';
import { cn } from '@/utils/cn';

export interface ToastProviderProps {
  children: React.ReactNode;
  defaultDuration?: number;
}

const DEFAULT_DURATION = 4000;

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultDuration = DEFAULT_DURATION,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Clear timeout if active
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback(
    ({ description, title, type = 'info', duration = defaultDuration }: ToastOptions & { type?: ToastType }) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newToast: ToastItem = {
        id,
        title,
        description,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [defaultDuration, dismiss]
  );

  const success = useCallback(
    (description: string, title?: string) => toast({ description, title, type: 'success' }),
    [toast]
  );

  const error = useCallback(
    (description: string, title?: string) => toast({ description, title, type: 'error' }),
    [toast]
  );

  const info = useCallback(
    (description: string, title?: string) => toast({ description, title, type: 'info' }),
    [toast]
  );

  const warning = useCallback(
    (description: string, title?: string) => toast({ description, title, type: 'warning' }),
    [toast]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      toast,
      success,
      error,
      info,
      warning,
      dismiss,
      clearAll,
    }),
    [toasts, toast, success, error, info, warning, dismiss, clearAll]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ item, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    info: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-emerald-200 dark:border-emerald-800/50 bg-card text-card-foreground',
    error: 'border-rose-200 dark:border-rose-800/50 bg-card text-card-foreground',
    warning: 'border-amber-200 dark:border-amber-800/50 bg-card text-card-foreground',
    info: 'border-border bg-card text-card-foreground',
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-slideInUp motion-reduce:animate-none',
        borders[item.type]
      )}
    >
      {icons[item.type]}
      <div className="flex-1 min-w-0 space-y-0.5">
        {item.title && (
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {item.title}
          </p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed break-words">
          {item.description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
