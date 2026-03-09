import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Scissors, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const SAMPLE_TYPES = [
  { value: 'proto', label: 'Proto Sample' },
  { value: 'fit', label: 'Fit Sample' },
  { value: 'size_set', label: 'Size Set' },
  { value: 'pp', label: 'PP Sample' },
  { value: 'top', label: 'TOP Sample' },
  { value: 'shipment', label: 'Shipment Sample' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-pink/15 text-pink border-pink/30',
};

interface SampleMakingTabProps {
  factoryId: string;
}

export function SampleMakingTab({ factoryId }: SampleMakingTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [styleId, setStyleId] = useState('');
  const [lineId, setLineId] = useState('');
  const [sampleType, setSampleType] = useState('proto');
  const [quantity, setQuantity] = useState(1);
  const [completedQty, setCompletedQty] = useState(0);
  const [requestedBy, setRequestedBy] = useState('');
  const [requestedDate, setRequestedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [remarks, setRemarks] = useState('');

  const { data: styles = [] } = useQuery({
    queryKey: ['sample-styles'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer').order('style_no');
      return data ?? [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['sample-lines', factoryId],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floors(name)').eq('is_active', true).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: samples = [], isLoading } = useQuery({
    queryKey: ['sample-orders', factoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sample_orders')
        .select('*, styles(style_no, buyer), lines(line_number, floors(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingCount = (samples as any[]).filter(s => s.status === 'pending' || s.status === 'in_progress').length;
  const completedCount = (samples as any[]).filter(s => s.status === 'completed').length;

  const openCreate = () => {
    setEditingId(null); setStyleId(''); setLineId(''); setSampleType('proto');
    setQuantity(1); setCompletedQty(0); setRequestedBy('');
    setRequestedDate(format(new Date(), 'yyyy-MM-dd')); setDueDate(''); setStatus('pending'); setRemarks('');
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id); setStyleId(s.style_id || ''); setLineId(s.line_id || '');
    setSampleType(s.sample_type); setQuantity(s.quantity); setCompletedQty(s.completed_qty);
    setRequestedBy(s.requested_by || ''); setRequestedDate(s.requested_date);
    setDueDate(s.due_date || ''); setStatus(s.status); setRemarks(s.remarks || '');
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error('You must be logged in');

      const payload = {
        factory_id: factoryId || null,
        style_id: styleId || null,
        line_id: lineId || null,
        sample_type: sampleType,
        quantity,
        completed_qty: completedQty,
        requested_by: requestedBy,
        requested_date: requestedDate,
        due_date: dueDate || null,
        completed_date: status === 'completed' ? format(new Date(), 'yyyy-MM-dd') : null,
        status,
        remarks,
        created_by: userId,
      };
      if (editingId) {
        const { error } = await supabase.from('sample_orders').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sample_orders').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-orders'] });
      toast.success(editingId ? 'Sample order updated' : 'Sample order created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sample_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-orders'] });
      toast.success('Sample order deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[1.5px] border-primary/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{(samples as any[]).length}</p><p className="text-[10.5px] text-muted-foreground font-medium">Total Samples</p></CardContent></Card>
        <Card className="border-[1.5px] border-warning/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{pendingCount}</p><p className="text-[10.5px] text-muted-foreground font-medium">Pending / In Progress</p></CardContent></Card>
        <Card className="border-[1.5px] border-success/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{completedCount}</p><p className="text-[10.5px] text-muted-foreground font-medium">Completed</p></CardContent></Card>
        <Card className="border-[1.5px] border-pink/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{(samples as any[]).filter(s => s.due_date && s.due_date < format(new Date(), 'yyyy-MM-dd') && s.status !== 'completed').length}</p><p className="text-[10.5px] text-muted-foreground font-medium">Overdue</p></CardContent></Card>
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2"><Scissors className="h-4 w-4 text-accent" /> Sample Making</CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-7"><Plus className="h-3.5 w-3.5" /> New Sample Order</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Type', 'Style', 'Buyer', 'Line', 'Qty', 'Done', 'Requested By', 'Request Date', 'Due Date', 'Status', ''].map(h => (
                    <th key={h} className={`py-2 px-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Qty', 'Done'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={11} className="py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
                ) : (samples as any[]).length === 0 ? (
                  <tr><td colSpan={11} className="py-12 text-center text-muted-foreground text-sm">No sample orders yet.</td></tr>
                ) : (samples as any[]).map(s => {
                  const isOverdue = s.due_date && s.due_date < format(new Date(), 'yyyy-MM-dd') && s.status !== 'completed';
                  return (
                    <tr key={s.id} className={`border-b border-border/50 hover:bg-muted/30 ${isOverdue ? 'bg-pink/5' : ''}`}>
                      <td className="py-2 px-2.5"><Badge variant="outline" className="text-[10px]">{SAMPLE_TYPES.find(t => t.value === s.sample_type)?.label || s.sample_type}</Badge></td>
                      <td className="py-2 px-2.5 font-medium text-foreground">{s.styles?.style_no || '—'}</td>
                      <td className="py-2 px-2.5 text-xs text-muted-foreground">{s.styles?.buyer || '—'}</td>
                      <td className="py-2 px-2.5 text-xs">{s.lines ? `L${s.lines.line_number}` : '—'}</td>
                      <td className="py-2 px-2.5 text-right font-bold">{s.quantity}</td>
                      <td className="py-2 px-2.5 text-right">{s.completed_qty > 0 ? <span className="text-success font-bold">{s.completed_qty}</span> : '0'}</td>
                      <td className="py-2 px-2.5 text-xs text-muted-foreground">{s.requested_by || '—'}</td>
                      <td className="py-2 px-2.5 text-xs font-mono text-muted-foreground">{s.requested_date}</td>
                      <td className="py-2 px-2.5 text-xs font-mono">{s.due_date ? <span className={isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}>{s.due_date}</span> : '—'}</td>
                      <td className="py-2 px-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[s.status] || ''}`}>{s.status}</Badge></td>
                      <td className="py-2 px-2.5">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'New'} Sample Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sample Type *</Label>
              <Select value={sampleType} onValueChange={setSampleType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAMPLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style</Label>
              <Select value={styleId} onValueChange={setStyleId}><SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line (optional)</Label>
              <Select value={lineId} onValueChange={setLineId}><SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>{lines.map((l: any) => <SelectItem key={l.id} value={l.id}>L{l.line_number} — {l.floors?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Completed Qty</Label><Input type="number" min={0} value={completedQty} onChange={e => setCompletedQty(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Requested By</Label><Input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} placeholder="e.g. Buyer QA" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Request Date</Label><Input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
