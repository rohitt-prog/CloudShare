import { useContext } from 'react';
import { AuthContext } from '@/features/auth/context/auth-context-base';
import type { AuthContextValue } from '@/features/auth/types';

/**
 * useAuth Hook
 * Consumes authentication context safely with boundary guard
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
