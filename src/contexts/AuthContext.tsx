import React, { createContext, useContext } from 'react';

type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

interface MockUser {
  id: string;
  email: string;
  user_metadata: { full_name: string };
}

interface AuthContextType {
  session: any;
  user: MockUser | null;
  roles: AppRole[];
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const mockUser: MockUser = {
  id: 'system-user',
  email: 'admin@armana.com',
  user_metadata: { full_name: 'System Admin' },
};

const AuthContext = createContext<AuthContextType>({
  session: {},
  user: mockUser,
  roles: ['admin'],
  isApproved: true,
  loading: false,
  signOut: async () => {},
  hasRole: () => true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    session: {},
    user: mockUser,
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
