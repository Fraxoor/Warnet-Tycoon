import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vppbhxxitcvorelllgvg.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Rh9a93xZB1p2jagX8n6nkQ_32yYYiUo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Converts a raw username into an internal email format for Supabase Auth.
 * Supabase auth requires email format, so username 'budi' maps to 'budi@warnet.local'.
 */
export function usernameToEmail(username: string): string {
  const sanitized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return `${sanitized || 'player'}@warnet.local`;
}

export function emailToUsername(email?: string | null): string {
  if (!email) return 'Player';
  return email.split('@')[0] || 'Player';
}
