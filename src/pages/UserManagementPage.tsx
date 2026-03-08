import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Shield, Crown, UserCheck, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: 'Admin', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: Crown },
  manager: { label: 'Manager / IE', color: 'bg-primary/15 text-primary border-primary/30', icon: Shield },
  line_chief: { label: 'Line Chief', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400', icon: UserCheck },
  operator: { label: 'Operator', color: 'bg-muted text-muted-foreground border-border', icon: UserIcon },
};

const ALL_ROLES: AppRole[] = ['admin', 'manager', 'line_chief', 'operator'];

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all profiles with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, created_at, factory_id')
        .order('created_at', { ascending: true });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      const roleMap: Record<string, AppRole> = {};
      (roles ?? []).forEach(r => {
        const existing = roleMap[r.user_id];
        if (!existing || ALL_ROLES.indexOf(r.role as AppRole) < ALL_ROLES.indexOf(existing)) {
          roleMap[r.user_id] = r.role as AppRole;
        }
      });

      return (profiles ?? []).map(p => ({
        ...p,
        role: roleMap[p.user_id] || 'operator',
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Delete existing roles
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (delErr) throw delErr;

      // Insert new role
      const { error: insErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update role'),
  });

  const roleCounts = ALL_ROLES.reduce((acc, role) => {
    acc[role] = users.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<AppRole, number>);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> User Management
        </h1>
        <p className="text-sm text-muted-foreground">View all users and manage role assignments</p>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ALL_ROLES.map(role => {
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          return (
            <Card key={role} className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{roleCounts[role]}</div>
                  <div className="text-[10px] text-muted-foreground">{cfg.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
                <TableHead className="text-xs">Current Role</TableHead>
                <TableHead className="text-xs">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              ) : users.map(u => {
                const cfg = ROLE_CONFIG[u.role];
                const isSelf = u.user_id === currentUser?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                          {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-foreground">
                            {u.full_name || 'Unknown'}
                            {isSelf && <span className="text-[9px] text-muted-foreground ml-1">(you)</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.phone || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(u.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(val) => updateRole.mutate({ userId: u.user_id, newRole: val as AppRole })}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map(r => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_CONFIG[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
