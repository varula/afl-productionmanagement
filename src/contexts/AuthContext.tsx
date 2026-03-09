import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  roles: [],
  isApproved: false,
  loading: true,
  signOut: async () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>(['admin']); // Default to admin for testing
  const [isApproved, setIsApproved] = useState(true); // Default to approved for testing
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (data && data.length > 0) {
        setRoles(data.map((r) => r.role as AppRole));
      }
    } catch (e) {
      console.warn('Could not fetch roles:', e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setIsApproved(data.is_approved ?? true);
      }
    } catch (e) {
      console.warn('Could not fetch profile:', e);
    }
  };

  const autoSignIn = async () => {
    // Seed test admin via edge function
    try {
      await supabase.functions.invoke('seed-test-admin');
    } catch (e) {
      console.warn('Seed function not available:', e);
    }

    // Sign in with test credentials
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'admin123456',
      });
      if (error) {
        console.error('Auto sign-in failed:', error.message);
      }
    } catch (e) {
      console.error('Sign-in error:', e);
    }
    // Always set loading to false after attempting
    setLoading(false);
  };

  useEffect(() => {
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchRoles(newSession.user.id);
          await fetchProfile(newSession.user.id);
        }
        setLoading(false);
        clearTimeout(timeout);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (existing?.user) {
        setSession(existing);
        setUser(existing.user);
        await fetchRoles(existing.user.id);
        await fetchProfile(existing.user.id);
        setLoading(false);
        clearTimeout(timeout);
      } else {
        // No session — auto sign in with test admin
        await autoSignIn();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles(['admin']); // Reset to default
    setIsApproved(true);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  // Show loading state but with a max timeout
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Signing in…</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, roles, isApproved, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}