import React from 'react';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Global AppProviders component
 * Orchestrates application-wide providers in strict hierarchical order:
 * 1. ThemeProvider (outermost - theme changes never reset auth or data state)
 * 2. AuthProvider (session state & user identity)
 * 3. ToastProvider (global notification infrastructure)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="cloudshare-theme">
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppProviders;
