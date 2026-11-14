/**
 * Auth Feature Domain Types
 */

import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: SupabaseSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<AuthActionResult>;
  signUp: (credentials: RegisterCredentials) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Utility to map Supabase User to internal AuthUser
 */
export function mapSupabaseUser(user: SupabaseUser | null): AuthUser | null {
  if (!user || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
    avatarUrl: (user.user_metadata?.avatar_url as string) || undefined,
    createdAt: user.created_at,
  };
}
