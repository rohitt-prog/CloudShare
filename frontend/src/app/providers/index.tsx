import React from 'react';
import { AuthProvider } from '@/features/auth/context/AuthProvider';

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Global AppProviders component
 * Orchestrates application-wide providers (Auth, Theme, etc.)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};
