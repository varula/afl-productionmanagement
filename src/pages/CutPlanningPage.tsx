import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Scissors, Eye, PenLine, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-primary/10 text-primary',
  in_progress: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

const emptyForm = {
  style_id: '', line_id: '', date: format(new Date(), 'yyyy-MM-dd'),
  planned_qty: 0, actual_qty: 0, fabric_type: '', markers: 0, plies: 0, status: 'planned', remarks: '',
};

export default function CutPlanningPage() {
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: styles = [] } = useQuery({
    queryKey: ['cut-styles'],
    queryFn: async () => { const { data } = await supabase.from('styles').select('id, style_no, buyer'); return data ?? []; },
  });
  const { data: lines = [] } = useQuery({
    queryKey: ['cut-lines'],
    queryFn: async () => { const { data } = await supabase.from('lines').select('id, line_number'); return data ?? []; },
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['cut_plans', factoryId],
    queryFn: async () => {
      let q = supabase.from('cut_plans').select('*').order('date', { ascending: false });
      if (factoryId) q = q.eq('factory_id', factoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const styleMap = new Map(styles.map((s: any) => [s.id, s]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.style_id || !factoryId) throw new Error('Style and factory required');
      const payload = {
        style_id: form.style_id, factory_id: factoryId,
        line_id: form.line_id || null, date: form.date,
        planned_qty: form.planned_qty, actual_qty: form.actual_qty,
        fabric_type: form.fabric_type, markers: form.markers, plies: form.plies,
        status: form.status, remarks: form.remarks || null,
      };
      if (editId) {
        const { error } = await supabase.from('cut_plans').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cut_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      setDialogOpen(false);
      toast.success(editId ? 'Cut plan updated' : 'Cut plan created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cut_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cut_plans'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ style_id: p.style_id, line_id: p.line_id || '', date: p.date, planned_qty: p.planned_qty, actual_qty: p.actual_qty, fabric_type: p.fabric_type || '', markers: p.markers, plies: p.plies, status: p.status, remarks: p.remarks || '' });
    setDialogOpen(true);
  };

  const totalPlanned = plans.reduce((s: number, p: any) => s + p.planned_qty, 0);
  const totalActual = plans.reduce((s: number, p: any) => s + p.actual_qty, 0);
  const efficiency = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scissors className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Cut Planning</h1>
            <p className="text-xs text-muted-foreground">Manage cutting room plans and output</p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Plans', value: plans.length, color: 'text-foreground' },
          { label: 'Planned Qty', value: totalPlanned.toLocaleString(), color: 'text-primary' },
          { label: 'Actual Qty', value: totalActual.toLocaleString(), color: 'text-success' },
          { label: 'Cut Efficiency', value: `${efficiency}%`, color: 'text-warning' },
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
                <TableHead className="text-xs">Style</TableHead>
                <TableHead className="text-xs">Buyer</TableHead>
                <TableHead className="text-xs text-right">Planned</TableHead>
                <TableHead className="text-xs text-right">Actual</TableHead>
                <TableHead className="text-xs">Fabric</TableHead>
                <TableHead className="text-xs text-right">Markers</TableHead>
                <TableHead className="text-xs text-right">Plies</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : plans.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-sm py-8 text-muted-foreground">No cut plans found</TableCell></TableRow>
              ) : plans.map((p: any) => {
                const st = styleMap.get(p.style_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{format(new Date(p.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs font-medium">{st?.style_no || '—'}</TableCell>
                    <TableCell className="text-xs">{st?.buyer || '—'}</TableCell>
                    <TableCell className="text-xs text-right">{p.planned_qty.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{p.actual_qty.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{p.fabric_type || '—'}</TableCell>
                    <TableCell className="text-xs text-right">{p.markers}</TableCell>
                    <TableCell className="text-xs text-right">{p.plies}</TableCell>
                    <TableCell><Badge className={`text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="entry" className="mt-0">
        <Card className="border-[1.5px]"><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New Cut Plan</h2>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Plan</Button>
          </div>
        </CardContent></Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Cut Plan</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Style</Label>
                <Select value={form.style_id} onValueChange={v => setForm(f => ({ ...f, style_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select style" /></SelectTrigger>
                  <SelectContent>{styles.map((s: any) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.style_no} — {s.buyer}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Planned Qty</Label>
                <Input type="number" value={form.planned_qty} onChange={e => setForm(f => ({ ...f, planned_qty: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Actual Qty</Label>
                <Input type="number" value={form.actual_qty} onChange={e => setForm(f => ({ ...f, actual_qty: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fabric Type</Label>
                <Input value={form.fabric_type} onChange={e => setForm(f => ({ ...f, fabric_type: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['planned', 'in_progress', 'completed', 'cancelled'].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Markers</Label>
                <Input type="number" value={form.markers} onChange={e => setForm(f => ({ ...f, markers: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plies</Label>
                <Input type="number" value={form.plies} onChange={e => setForm(f => ({ ...f, plies: +e.target.value }))} className="h-8 text-xs" />
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
