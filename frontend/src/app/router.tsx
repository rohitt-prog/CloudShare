import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RouterContext, type AppRoute, type RouterContextValue } from '@/app/router-context';

export interface RouterProps {
  initialRoute?: AppRoute;
}

/**
 * App Router Component with Protected Route Enforcement
 */
export const AppRouter: React.FC<RouterProps> = ({ initialRoute = 'home' }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(initialRoute);
  const [intendedRoute, setIntendedRoute] = useState<AppRoute | null>(null);

  const navigate = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
  }, []);

  // Protected route enforcement effect
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = currentRoute === 'login' || currentRoute === 'register';

    if (!isAuthenticated && !isAuthRoute) {
      // Unauthenticated user trying to access protected route -> save intended route and redirect to login
      setIntendedRoute(currentRoute);
      setCurrentRoute('login');
    } else if (isAuthenticated && isAuthRoute) {
      // Authenticated user trying to access login/register -> redirect to intended route or home
      const destination = intendedRoute && intendedRoute !== 'login' && intendedRoute !== 'register'
        ? intendedRoute
        : 'home';
      setIntendedRoute(null);
      setCurrentRoute(destination);
    }
  }, [isAuthenticated, isLoading, currentRoute, intendedRoute]);

  const contextValue = useMemo<RouterContextValue>(
    () => ({ currentRoute, navigate }),
    [currentRoute, navigate]
  );

  // 1. Initial loading screen while restoring Supabase session
  if (isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center space-y-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <p className="text-xs font-medium text-slate-500">Checking authentication session...</p>
      </div>
    );
  }

  // 2. Render route content
  let pageContent: React.ReactNode;
  switch (currentRoute) {
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
    case 'home':
    default:
      pageContent = <HomePage />;
      break;
  }

  return (
    <RouterContext.Provider value={contextValue}>
      {pageContent}
    </RouterContext.Provider>
  );
};

export default AppRouter;
