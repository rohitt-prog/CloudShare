/**
 * Global, Feature, and Database Types Re-export Hub
 */

export * from '@/features/auth/types';
export * from '@/features/files/types';
export * from '@/features/sharing/types';
export * from '@/types/database';

export interface AppConfig {
  supabaseUrl: string;
  isConfigured: boolean;
}
