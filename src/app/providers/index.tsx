import React from 'react';

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Global AppProviders component
 * Orchestrates application-wide providers (Theme, Auth, QueryClient, etc.)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};
