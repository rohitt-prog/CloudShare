import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthValidationResult,
  AuthActionResult,
} from '@/features/auth/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validates login input fields
 */
export function validateLogin(credentials: LoginCredentials): AuthValidationResult {
  const errors: Record<string, string> = {};

  const email = credentials.email?.trim() || '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!credentials.password) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates registration input fields
 */
export function validateRegistration(credentials: RegisterCredentials): AuthValidationResult {
  const errors: Record<string, string> = {};

  const email = credentials.email?.trim() || '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!credentials.password) {
    errors.password = 'Password is required.';
  } else if (credentials.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  if (credentials.confirmPassword !== undefined) {
    if (!credentials.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.';
    } else if (credentials.password !== credentials.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Maps Supabase auth error codes and messages to clear user-facing errors
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few moments and try again.';
  }
  if (message.includes('Failed to fetch') || message.includes('network') || message.includes('NetworkError')) {
    return 'Unable to reach the authentication service. Please check your internet connection.';
  }

  return message;
}

/**
 * Authentication Service Wrapper
 * Encapsulates direct Supabase GoTrue Auth interactions
 */
export const authService = {
  /**
   * Signs in an existing user with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<AuthActionResult> {
    const validation = validateLogin(credentials);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError };
    }

    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  },

  /**
   * Registers a new user with email, password, and optional full name
   */
  async signUp(credentials: RegisterCredentials): Promise<AuthActionResult> {
    const validation = validateRegistration(credentials);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError };
    }

    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email.trim(),
        password: credentials.password,
        options: {
          data: credentials.fullName?.trim() ? { full_name: credentials.fullName.trim() } : undefined,
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      // If email confirmation is enabled, session will be null upon sign up
      const requiresEmailConfirmation = !data.session;

      return {
        success: true,
        requiresEmailConfirmation,
      };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  },

  /**
   * Signs out current authenticated user
   */
  async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: formatAuthError(error) };
      }
      return {};
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  },

  /**
   * Retrieves active session from local storage or cache
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data) return null;
      return data.session;
    } catch {
      return null;
    }
  },

  /**
   * Subscribes to Supabase auth state change events
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): {
    unsubscribe: () => void;
  } {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};
