import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * DeepGuard AI — Centralized Supabase Client
 * 
 * Manages Supabase Auth, OAuth flows, and PostgreSQL Row-Level-Security (RLS) data queries.
 * Never includes service-role keys or backend secrets.
 */

const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  ? String(import.meta.env.VITE_SUPABASE_URL).trim() 
  : '';

const envKey = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY))
  ? String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY).trim()
  : '';

// Validate that a real key has been supplied, not an unconfigured placeholder
const isPlaceholderKey = !envKey || envKey.includes('your_key_here') || envKey.includes('placeholder');
const isPlaceholderUrl = !envUrl || envUrl.includes('your-project-id');

export const isSupabaseConfigured: boolean = Boolean(!isPlaceholderKey && !isPlaceholderUrl && envUrl.startsWith('https://'));

export const SUPABASE_CONFIG_MESSAGE: string = isSupabaseConfigured
  ? ''
  : 'Supabase configuration is required. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local to enable live authentication and cloud sync.';

// Safe client instantiation: if unconfigured during development, initialize a stubbed dummy client
// to prevent Vite module evaluation exceptions while truthfully surfacing the unconfigured state in UI.
const dummyUrl = 'https://eehwhtxdnmngmaushwzv.supabase.co';
const dummyKey = 'sb_publishable_dummy_key_for_initialization';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? envUrl : dummyUrl,
  isSupabaseConfigured ? envKey : dummyKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
