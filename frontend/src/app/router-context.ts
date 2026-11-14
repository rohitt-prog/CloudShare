import { createContext, useContext } from 'react';

export type AppRoute = 'home' | 'login' | 'register' | 'dashboard' | 'share';

export interface NavigateOptions {
  shareToken?: string | null;
}

export interface RouterContextValue {
  currentRoute: AppRoute;
  shareToken: string | null;
  navigate: (route: AppRoute, options?: NavigateOptions) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within AppRouter');
  }
  return context;
}
