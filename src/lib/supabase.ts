import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Validates whether live Supabase credentials are configured in the environment
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

let supabaseClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns a typed singleton instance of the Supabase client.
 * Uses public anonymous credentials only.
 * WARNING: The service_role secret key must NEVER be included in frontend code.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabaseClientInstance) {
    if (!isSupabaseConfigured && import.meta.env.DEV) {
      console.warn(
        '[CloudShare] Supabase credentials are unconfigured or using template placeholders. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    supabaseClientInstance = createClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return supabaseClientInstance;
};

/**
 * Shared singleton Supabase client
 */
export const supabase = getSupabaseClient();
