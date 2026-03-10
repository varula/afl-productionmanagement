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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (data && data.length > 0) {
        setRoles(data.map((r) => r.role as AppRole));
      } else {
        setRoles(['operator']);
      }
    } catch (e) {
      console.warn('Could not fetch roles:', e);
      setRoles(['operator']);
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
        setIsApproved(data.is_approved ?? false);
      }
    } catch (e) {
      console.warn('Could not fetch profile:', e);
    }
  };

  useEffect(() => {
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
        } else {
          setRoles([]);
          setIsApproved(false);
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
      }
      setLoading(false);
      clearTimeout(timeout);
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
    setRoles([]);
    setIsApproved(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, roles, isApproved, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
