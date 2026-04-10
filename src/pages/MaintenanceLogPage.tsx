import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { Wrench, Eye, PenLine, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-destructive/10 text-destructive',
  in_progress: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  deferred: 'bg-muted text-muted-foreground',
};

const emptyForm = { machine_name: '', maintenance_type: 'corrective', description: '', status: 'reported', line_id: '', remarks: '' };

export default function MaintenanceLogPage() {
  const factoryId = useFactoryId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: lines = [] } = useQuery({
    queryKey: ['maint-lines'],
    queryFn: async () => { const { data } = await supabase.from('lines').select('id, line_number'); return data ?? []; },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['maintenance_logs', factoryId],
    queryFn: async () => {
      let q = supabase.from('maintenance_logs').select('*').order('reported_at', { ascending: false });
      if (factoryId) q = q.eq('factory_id', factoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.machine_name || !factoryId || !user?.id) throw new Error('Machine name and factory required');
      const payload = {
        factory_id: factoryId, line_id: form.line_id || null,
        machine_name: form.machine_name, maintenance_type: form.maintenance_type,
        description: form.description, status: form.status,
        reported_by: user.id, remarks: form.remarks || null,
      };
      if (editId) {
        const { error } = await supabase.from('maintenance_logs').update({ ...payload, resolved_at: form.status === 'resolved' ? new Date().toISOString() : null, resolved_by: form.status === 'resolved' ? user.id : null }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('maintenance_logs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_logs'] });
      setDialogOpen(false);
      toast.success(editId ? 'Log updated' : 'Maintenance reported');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maintenance_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance_logs'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({ machine_name: m.machine_name, maintenance_type: m.maintenance_type, description: m.description || '', status: m.status, line_id: m.line_id || '', remarks: m.remarks || '' });
    setDialogOpen(true);
  };

  const open = logs.filter((l: any) => l.status === 'reported' || l.status === 'in_progress').length;
  const resolved = logs.filter((l: any) => l.status === 'resolved').length;

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Maintenance Log</h1>
            <p className="text-xs text-muted-foreground">Machine maintenance and repair tracking</p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Logs', value: logs.length, color: 'text-foreground' },
          { label: 'Open Issues', value: open, color: 'text-destructive' },
          { label: 'Resolved', value: resolved, color: 'text-success' },
          { label: 'Preventive', value: logs.filter((l: any) => l.maintenance_type === 'preventive').length, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="border-[1.5px]"><CardContent className="p-3"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <Card className="border-[1.5px]"><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Reported</TableHead>
                <TableHead className="text-xs">Machine</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Resolved</TableHead>
                <TableHead className="text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm py-8 text-muted-foreground">No maintenance logs</TableCell></TableRow>
              ) : logs.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{format(new Date(m.reported_at), 'dd MMM yyyy HH:mm')}</TableCell>
                  <TableCell className="text-xs font-medium">{m.machine_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{m.maintenance_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.description || '—'}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[m.status] || ''}`}>{m.status}</Badge></TableCell>
                  <TableCell className="text-xs">{m.resolved_at ? format(new Date(m.resolved_at), 'dd MMM HH:mm') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="entry" className="mt-0">
        <Card className="border-[1.5px]"><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Report Maintenance</h2>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Report</Button>
          </div>
        </CardContent></Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Report'} Maintenance</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Machine Name</Label>
                <Input value={form.machine_name} onChange={e => setForm(f => ({ ...f, machine_name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.maintenance_type} onValueChange={v => setForm(f => ({ ...f, maintenance_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['corrective', 'preventive', 'predictive'].map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['reported', 'in_progress', 'resolved', 'deferred'].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Line</Label>
                <Select value={form.line_id} onValueChange={v => setForm(f => ({ ...f, line_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{lines.map((l: any) => <SelectItem key={l.id} value={l.id} className="text-xs">Line {l.line_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Remarks</Label>
                <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
