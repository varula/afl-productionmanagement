import React, { createContext, useContext } from 'react';

type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

interface AuthContextType {
  session: null;
  user: null;
  roles: AppRole[];
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  roles: ['admin'],
  isApproved: true,
  loading: false,
  signOut: async () => {},
  hasRole: () => true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    session: null,
    user: null,
    roles: ['admin'],
    isApproved: true,
    loading: false,
    signOut: async () => {},
    hasRole: () => true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
