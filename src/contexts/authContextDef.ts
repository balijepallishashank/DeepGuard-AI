import { createContext } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  configError: string;
  authError: string | null;
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
