import React from 'react';
import { HomePage } from '@/pages/HomePage';

export type AppRoute = 'home' | 'login' | 'dashboard' | 'shared';

export interface RouterProps {
  currentRoute?: AppRoute;
}

/**
 * App Router Component
 * Modular view dispatcher mapping application routes to page components
 */
export const AppRouter: React.FC<RouterProps> = ({ currentRoute = 'home' }) => {
  switch (currentRoute) {
    case 'home':
    default:
      return <HomePage />;
  }
};
