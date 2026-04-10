import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { Lightbulb, Eye, PenLine, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-primary/10 text-primary',
  approved: 'bg-warning/10 text-warning',
  implemented: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const CATEGORIES = ['process', 'quality', 'safety', 'cost', 'layout', 'ergonomics', 'other'];

const emptyForm = { title: '', description: '', category: 'process', before_state: '', after_state: '', savings_estimate: 0, status: 'proposed', line_id: '' };

export default function KaizenLogPage() {
  const factoryId = useFactoryId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: lines = [] } = useQuery({
    queryKey: ['kaizen-lines'],
    queryFn: async () => { const { data } = await supabase.from('lines').select('id, line_number'); return data ?? []; },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['kaizen_logs', factoryId],
    queryFn: async () => {
      let q = supabase.from('kaizen_logs').select('*').order('created_at', { ascending: false });
      if (factoryId) q = q.eq('factory_id', factoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !factoryId || !user?.id) throw new Error('Title and factory required');
      const payload = {
        factory_id: factoryId, line_id: form.line_id || null, title: form.title,
        description: form.description, category: form.category, before_state: form.before_state,
        after_state: form.after_state, savings_estimate: form.savings_estimate,
        status: form.status, submitted_by: user.id,
      };
      if (editId) {
        const { error } = await supabase.from('kaizen_logs').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kaizen_logs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kaizen_logs'] });
      setDialogOpen(false);
      toast.success(editId ? 'Kaizen updated' : 'Kaizen submitted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kaizen_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kaizen_logs'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (k: any) => {
    setEditId(k.id);
    setForm({ title: k.title, description: k.description || '', category: k.category, before_state: k.before_state || '', after_state: k.after_state || '', savings_estimate: k.savings_estimate || 0, status: k.status, line_id: k.line_id || '' });
    setDialogOpen(true);
  };

  const implemented = logs.filter((l: any) => l.status === 'implemented').length;
  const totalSavings = logs.filter((l: any) => l.status === 'implemented').reduce((s: number, l: any) => s + (l.savings_estimate || 0), 0);

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Kaizen Log</h1>
            <p className="text-xs text-muted-foreground">Continuous improvement tracking</p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Kaizens', value: logs.length, color: 'text-foreground' },
          { label: 'Implemented', value: implemented, color: 'text-success' },
          { label: 'Proposed', value: logs.filter((l: any) => l.status === 'proposed').length, color: 'text-primary' },
          { label: 'Est. Savings', value: `$${totalSavings.toLocaleString()}`, color: 'text-warning' },
        ].map(s => (
          <Card key={s.label} className="border-[1.5px]"><CardContent className="p-3"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <Card className="border-[1.5px]"><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Before</TableHead>
                <TableHead className="text-xs">After</TableHead>
                <TableHead className="text-xs text-right">Savings</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm py-8 text-muted-foreground">No kaizen logs found</TableCell></TableRow>
              ) : logs.map((k: any) => (
                <TableRow key={k.id}>
                  <TableCell className="text-xs">{format(new Date(k.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{k.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{k.category}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{k.before_state || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{k.after_state || '—'}</TableCell>
                  <TableCell className="text-xs text-right">${(k.savings_estimate || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[k.status] || ''}`}>{k.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(k)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(k.id)}><Trash2 className="h-3 w-3" /></Button>
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
            <h2 className="text-sm font-semibold">Submit Kaizen</h2>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Kaizen</Button>
          </div>
        </CardContent></Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Kaizen</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['proposed', 'approved', 'implemented', 'rejected'].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-xs min-h-[60px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Before State</Label>
                <Input value={form.before_state} onChange={e => setForm(f => ({ ...f, before_state: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">After State</Label>
                <Input value={form.after_state} onChange={e => setForm(f => ({ ...f, after_state: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Est. Savings ($)</Label>
                <Input type="number" value={form.savings_estimate} onChange={e => setForm(f => ({ ...f, savings_estimate: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Line</Label>
                <Select value={form.line_id} onValueChange={v => setForm(f => ({ ...f, line_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{lines.map((l: any) => <SelectItem key={l.id} value={l.id} className="text-xs">Line {l.line_number}</SelectItem>)}</SelectContent>
                </Select>
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
