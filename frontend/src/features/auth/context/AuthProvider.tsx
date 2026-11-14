import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  AuthContextValue,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  AuthActionResult,
} from '@/features/auth/types';
import { mapSupabaseUser } from '@/features/auth/types';
import { authService } from '@/features/auth/services/auth.service';
import { AuthContext } from '@/features/auth/context/auth-context-base';

export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Centralized Authentication Provider
 * Synchronizes with Supabase Auth events and manages user session lifecycle
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize state from a Supabase Session
  const syncSession = useCallback((currentSession: Session | null) => {
    setSession(currentSession);
    setUser(mapSupabaseUser(currentSession?.user ?? null));
  }, []);

  // Initialize and restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const initialSession = await authService.getSession();
        if (isMounted) {
          syncSession(initialSession);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[CloudShare Auth] Error restoring initial session:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    // Subscribe to auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.)
    const { unsubscribe } = authService.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        syncSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(async (credentials: LoginCredentials): Promise<AuthActionResult> => {
    setError(null);
    const result = await authService.signIn(credentials);
    if (!result.success && result.error) {
      setError(result.error);
    }
    return result;
  }, []);

  const signUp = useCallback(async (credentials: RegisterCredentials): Promise<AuthActionResult> => {
    setError(null);
    const result = await authService.signUp(credentials);
    if (!result.success && result.error) {
      setError(result.error);
    }
    return result;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    await authService.signOut();
    syncSession(null);
  }, [syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: Boolean(user && session),
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [user, session, isLoading, error, signIn, signUp, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
