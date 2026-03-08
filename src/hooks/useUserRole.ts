import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  line_chief: 2,
  operator: 1,
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager / IE',
  line_chief: 'Line Chief',
  operator: 'Operator',
};

export function useUserRole() {
  const { roles, hasRole } = useAuth();

  const highestRole: AppRole = roles.length > 0
    ? roles.reduce((best, r) => ROLE_HIERARCHY[r] > ROLE_HIERARCHY[best] ? r : best, roles[0] as AppRole)
    : 'operator';

  const roleLabel = ROLE_LABELS[highestRole] || 'Operator';

  const canEdit = hasRole('admin') || hasRole('manager') || hasRole('line_chief');
  const canManage = hasRole('admin') || hasRole('manager');
  const isAdmin = hasRole('admin');

  // Minimum role check: returns true if user has at least the given role level
  const hasMinRole = (minRole: AppRole) => {
    const minLevel = ROLE_HIERARCHY[minRole];
    return roles.some(r => ROLE_HIERARCHY[r] >= minLevel);
  };

  return { highestRole, roleLabel, canEdit, canManage, isAdmin, hasMinRole, hasRole };
}
