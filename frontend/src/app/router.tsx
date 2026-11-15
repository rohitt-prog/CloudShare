import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { HomePage } from '@/pages/HomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SharedFilePage } from '@/pages/SharedFilePage';
import { AppShell } from '@/components/layout/AppShell';
import {
  RouterContext,
  type AppRoute,
  type RouterContextValue,
  type NavigateOptions,
} from '@/app/router-context';

export interface RouterProps {
  initialRoute?: AppRoute;
  initialShareToken?: string | null;
}

/**
 * Extracts initial route and share token from window location if present.
 */
function getInitialRouteState(defaultRoute: AppRoute = 'home', defaultToken: string | null = null): {
  route: AppRoute;
  token: string | null;
} {
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      return { route: 'share', token: token.trim() };
    }
  }
  return { route: defaultRoute, token: defaultToken };
}

/**
 * App Router Component with Protected Route Enforcement & Public Share Route Support
 */
export const AppRouter: React.FC<RouterProps> = ({
  initialRoute = 'home',
  initialShareToken = null,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  const initialState = useMemo(
    () => getInitialRouteState(initialRoute, initialShareToken),
    [initialRoute, initialShareToken]
  );

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(initialState.route);
  const [shareToken, setShareToken] = useState<string | null>(initialState.token);
  const [intendedRoute, setIntendedRoute] = useState<AppRoute | null>(null);

  const navigate = useCallback((route: AppRoute, options?: NavigateOptions) => {
    if (route !== 'share' && typeof window !== 'undefined' && window.history?.replaceState) {
      // Clear share parameter from URL when navigating away from guest share page
      const url = new URL(window.location.href);
      if (url.searchParams.has('share')) {
        url.searchParams.delete('share');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }

    if (options?.shareToken !== undefined) {
      setShareToken(options.shareToken);
    }
    setCurrentRoute(route);
  }, []);

  // Listen for browser navigation / popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('share');
        if (token) {
          setShareToken(token.trim());
          setCurrentRoute('share');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Protected route enforcement effect
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = currentRoute === 'login' || currentRoute === 'register';
    const isGuestRoute = currentRoute === 'share';

    if (!isAuthenticated && !isAuthRoute && !isGuestRoute) {
      // Unauthenticated user trying to access protected route -> save intended route and redirect to login
      setIntendedRoute(currentRoute);
      setCurrentRoute('login');
    } else if (isAuthenticated && isAuthRoute) {
      // Authenticated user trying to access login/register -> redirect to intended route or home
      const destination =
        intendedRoute && intendedRoute !== 'login' && intendedRoute !== 'register'
          ? intendedRoute
          : 'home';
      setIntendedRoute(null);
      setCurrentRoute(destination);
    }
  }, [isAuthenticated, isLoading, currentRoute, intendedRoute]);

  const contextValue = useMemo<RouterContextValue>(
    () => ({ currentRoute, shareToken, navigate }),
    [currentRoute, shareToken, navigate]
  );

  // 1. Initial loading screen while restoring Supabase session
  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center space-y-3 bg-background text-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Checking authentication session...</p>
      </div>
    );
  }

  // 2. Render route content
  let pageContent: React.ReactNode;
  switch (currentRoute) {
    case 'share':
      pageContent = (
        <SharedFilePage
          token={shareToken || ''}
          onNavigateToLogin={() => navigate('login')}
          onNavigateToHome={() => navigate('home')}
        />
      );
      break;

    case 'login':
      pageContent = (
        <LoginPage
          onNavigateToRegister={() => navigate('register')}
          onSuccess={() => navigate(intendedRoute || 'home')}
        />
      );
      break;

    case 'register':
      pageContent = (
        <RegisterPage
          onNavigateToLogin={() => navigate('login')}
          onSuccess={() => navigate('home')}
        />
      );
      break;

    case 'dashboard':
      pageContent = (
        <AppShell>
          <DashboardPage />
        </AppShell>
      );
      break;

    case 'settings':
      pageContent = (
        <AppShell>
          <SettingsPage />
        </AppShell>
      );
      break;

    case 'home':
    default:
      pageContent = (
        <AppShell>
          <HomePage />
        </AppShell>
      );
      break;
  }

  return (
    <RouterContext.Provider value={contextValue}>
      {pageContent}
    </RouterContext.Provider>
  );
};

export default AppRouter;
