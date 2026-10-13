import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Session, User as SupabaseUser, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SUPABASE_CONFIG_MESSAGE } from '../utils/supabase';
import type { User } from '../types';
import { AuthContext } from './authContextDef';

function mapSupabaseUserToAppUser(sbUser: SupabaseUser): User {
  const meta = sbUser.user_metadata || {};
  const createdAt = sbUser.created_at ? new Date(sbUser.created_at) : new Date();
  const monthYear = createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    id: sbUser.id,
    name: meta.full_name || meta.name || (sbUser.email ? sbUser.email.split('@')[0] : 'Forensic Investigator'),
    email: sbUser.email || '',
    avatarUrl: meta.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: meta.role || 'Forensic Investigator',
    memberSince: monthYear
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  // Restore existing session and set up auth listener
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        } else if (data?.session && isMounted) {
          setSession(data.session);
          setSupabaseUser(data.session.user);
          setUser(mapSupabaseUserToAppUser(data.session.user));
        }
      } catch (err) {
        console.warn('Error reading persisted session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes (login, logout, token refresh, password recovery)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (newSession) {
          setSession(newSession);
          setSupabaseUser(newSession.user);
          setUser(mapSupabaseUserToAppUser(newSession.user));
        } else {
          setSession(null);
          setSupabaseUser(null);
          // Only clear app user if they were not logged in via local demo session
          setUser(prev => (prev?.id.startsWith('usr_demo_') ? prev : null));
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const err = SUPABASE_CONFIG_MESSAGE;
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.session.user);
        setUser(mapSupabaseUserToAppUser(data.session.user));
        return { success: true };
      }

      return { success: false, error: 'Authentication succeeded but no active session was returned.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string, fullName?: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const err = SUPABASE_CONFIG_MESSAGE;
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || 'Forensic Investigator',
            role: 'Forensic Investigator'
          },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required (user exists but session is null)
      const requiresEmailVerification = Boolean(data.user && !data.session);

      if (data.session && data.user) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setUser(mapSupabaseUserToAppUser(data.user));
      }

      return { success: true, requiresEmailVerification };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const err = SUPABASE_CONFIG_MESSAGE;
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const err = SUPABASE_CONFIG_MESSAGE;
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset request failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const err = SUPABASE_CONFIG_MESSAGE;
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      setIsPasswordRecovery(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign-out error:', err);
    } finally {
      setIsDemoSession(false);
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      setIsPasswordRecovery(false);
    }
  }, []);

  const loginAsDemo = useCallback(() => {
    const demoUser: User = {
      id: 'usr_demo_alex',
      name: 'Alex Rivers',
      email: 'alex.investigator@deepfake.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Lead Forensic Investigator',
      memberSince: 'October 2026'
    };
    setIsDemoSession(true);
    setUser(demoUser);
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const accessToken = session?.access_token || (isDemoSession ? 'demo-investigator-local-token' : null);

  const value = useMemo(() => ({
    user,
    supabaseUser,
    session,
    accessToken,
    isLoading,
    isConfigured: isSupabaseConfigured,
    configError: SUPABASE_CONFIG_MESSAGE,
    authError,
    isPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    signOut,
    loginAsDemo,
    clearError
  }), [
    user,
    supabaseUser,
    session,
    accessToken,
    isLoading,
    authError,
    isPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    signOut,
    loginAsDemo,
    clearError
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
