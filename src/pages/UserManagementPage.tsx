import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Users, Shield, Crown, UserCheck, User as UserIcon, CheckCircle2, XCircle, Clock,
  Trash2, Pencil, Search,
} from 'lucide-react';
import { format } from 'date-fns';

type AppRole = 'admin' | 'manager' | 'line_chief' | 'operator';

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: 'Admin', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: Crown },
  manager: { label: 'Manager / IE', color: 'bg-primary/15 text-primary border-primary/30', icon: Shield },
  line_chief: { label: 'Line Chief', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400', icon: UserCheck },
  operator: { label: 'Operator', color: 'bg-muted text-muted-foreground border-border', icon: UserIcon },
};

const ALL_ROLES: AppRole[] = ['admin', 'manager', 'line_chief', 'operator'];

const FILTER_MAP: Record<string, { type: 'status' | 'role' | 'all'; value?: string }> = {
  'usr-all': { type: 'all' },
  'usr-pending': { type: 'status', value: 'pending' },
  'usr-approved': { type: 'status', value: 'approved' },
  'usr-admin': { type: 'role', value: 'admin' },
  'usr-manager': { type: 'role', value: 'manager' },
  'usr-linechief': { type: 'role', value: 'line_chief' },
  'usr-operator': { type: 'role', value: 'operator' },
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { activeFilter } = useOutletContext<{ activeFilter: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deleteUser, setDeleteUser] = useState<any | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, created_at, factory_id, is_approved')
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
      const { error: delErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update role'),
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approve })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(approve ? 'User approved' : 'User access revoked');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update approval'),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, fullName, phone }: { userId: string; fullName: string; phone: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Profile updated');
      setEditUser(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update profile'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Delete roles first, then profile (cascade from auth won't work from client)
      const { error: rErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (rErr) throw rErr;
      const { error: pErr } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User removed');
      setDeleteUser(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete user'),
  });

  const pendingCount = users.filter(u => !u.is_approved).length;
  const approvedCount = users.filter(u => u.is_approved).length;
  const roleCounts = ALL_ROLES.reduce((acc, role) => {
    acc[role] = users.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<AppRole, number>);

  const currentFilter = FILTER_MAP[activeFilter] || { type: 'all' };

  const filteredUsers = users.filter(u => {
    // Sidebar filter
    if (currentFilter.type === 'status') {
      if (currentFilter.value === 'pending' && u.is_approved) return false;
      if (currentFilter.value === 'approved' && !u.is_approved) return false;
    }
    if (currentFilter.type === 'role' && u.role !== currentFilter.value) return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || (u.phone || '').includes(q);
    }
    return true;
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditName(u.full_name || '');
    setEditPhone(u.phone || '');
  };

  return (
    <div className="space-y-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> User Management
            </h1>
            <p className="text-sm text-muted-foreground">Manage user approvals and role assignments</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{pendingCount}</div>
                <div className="text-[10px] text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/15 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{approvedCount}</div>
                <div className="text-[10px] text-muted-foreground">Approved</div>
              </div>
            </CardContent>
          </Card>
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

        {/* Search + Quick Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/60 border border-border/50 rounded-xl px-3 py-2 flex-1 max-w-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
            />
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No users found</TableCell>
                  </TableRow>
                ) : filteredUsers.map(u => {
                  const isSelf = u.user_id === currentUser?.id;
                  return (
                    <TableRow key={u.id} className={!u.is_approved ? 'bg-amber-500/[0.03]' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
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
                        {u.is_approved ? (
                          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Clock className="h-2.5 w-2.5 mr-1" /> Pending
                          </Badge>
                        )}
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {!isSelf && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(u)}
                                title="Edit profile"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              {u.is_approved ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[11px] text-destructive hover:text-destructive h-7 gap-1"
                                  onClick={() => toggleApproval.mutate({ userId: u.user_id, approve: false })}
                                >
                                  <XCircle className="h-3 w-3" /> Revoke
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-[11px] h-7 gap-1"
                                  onClick={() => toggleApproval.mutate({ userId: u.user_id, approve: true })}
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Approve
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteUser(u)}
                                title="Delete user"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      {/* Edit Profile Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Update name and phone for {editUser?.full_name || 'this user'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs">Full Name</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-xs">Phone</Label>
              <Input id="edit-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-9 text-sm" placeholder="+880…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={updateProfile.isPending}
              onClick={() => editUser && updateProfile.mutate({ userId: editUser.user_id, fullName: editName, phone: editPhone })}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteUser?.full_name || 'this user'}</span>? This will delete their profile and role assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteUserMutation.isPending}
              onClick={() => deleteUser && deleteUserMutation.mutate({ userId: deleteUser.user_id })}
            >
              {deleteUserMutation.isPending ? 'Deleting…' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
