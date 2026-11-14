import { createContext, useContext } from 'react';

export type AppRoute = 'home' | 'login' | 'register' | 'dashboard';

export interface RouterContextValue {
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within AppRouter');
  }
  return context;
}
