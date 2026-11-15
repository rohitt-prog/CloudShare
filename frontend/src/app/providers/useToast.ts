import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  description: string;
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  toast: (options: ToastOptions & { type?: ToastType }) => string;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  info: (description: string, title?: string) => string;
  warning: (description: string, title?: string) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
