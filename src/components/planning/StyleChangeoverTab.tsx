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
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface StyleChangeoverTabProps {
  factoryId: string;
}

export function StyleChangeoverTab({ factoryId }: StyleChangeoverTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lineId, setLineId] = useState('');
  const [fromStyleId, setFromStyleId] = useState('');
  const [toStyleId, setToStyleId] = useState('');
  const [changeoverDate, setChangeoverDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hoursLost, setHoursLost] = useState(0);
  const [learningDays, setLearningDays] = useState(3);
  const [notes, setNotes] = useState('');

  const { data: lines = [] } = useQuery({
    queryKey: ['changeover-lines', factoryId],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floors(name)').eq('is_active', true).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['changeover-styles'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer').order('style_no');
      return data ?? [];
    },
  });

  const { data: changeovers = [], isLoading } = useQuery({
    queryKey: ['style-changeovers', factoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('style_changeovers')
        .select('*, lines(line_number, floors(name)), from_style:styles!style_changeovers_from_style_id_fkey(style_no, buyer), to_style:styles!style_changeovers_to_style_id_fkey(style_no, buyer)')
        .order('changeover_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalHoursLost = (changeovers as any[]).reduce((s, c) => s + Number(c.hours_lost), 0);

  const openCreate = () => {
    setEditingId(null); setLineId(''); setFromStyleId(''); setToStyleId('');
    setChangeoverDate(format(new Date(), 'yyyy-MM-dd')); setHoursLost(0); setLearningDays(3); setNotes('');
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id); setLineId(c.line_id); setFromStyleId(c.from_style_id || ''); setToStyleId(c.to_style_id);
    setChangeoverDate(c.changeover_date); setHoursLost(Number(c.hours_lost)); setLearningDays(c.learning_curve_days); setNotes(c.notes || '');
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        line_id: lineId,
        from_style_id: fromStyleId || null,
        to_style_id: toStyleId,
        changeover_date: changeoverDate,
        hours_lost: hoursLost,
        learning_curve_days: learningDays,
        notes,
      };
      if (editingId) {
        const { error } = await supabase.from('style_changeovers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('style_changeovers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-changeovers'] });
      toast.success(editingId ? 'Changeover updated' : 'Changeover recorded');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('style_changeovers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-changeovers'] });
      toast.success('Changeover deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-[1.5px] border-primary/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{(changeovers as any[]).length}</p><p className="text-[10.5px] text-muted-foreground font-medium">Total Changeovers</p></CardContent></Card>
        <Card className="border-[1.5px] border-pink/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{totalHoursLost.toFixed(1)}h</p><p className="text-[10.5px] text-muted-foreground font-medium">Total Hours Lost</p></CardContent></Card>
        <Card className="border-[1.5px] border-warning/20"><CardContent className="p-3 text-center"><p className="text-lg font-extrabold">{(changeovers as any[]).length > 0 ? ((changeovers as any[]).reduce((s, c) => s + c.learning_curve_days, 0) / (changeovers as any[]).length).toFixed(1) : 0}</p><p className="text-[10.5px] text-muted-foreground font-medium">Avg Learning Days</p></CardContent></Card>
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2"><RefreshCw className="h-4 w-4 text-accent" /> Style Changeovers</CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-7"><Plus className="h-3.5 w-3.5" /> Record Changeover</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Date', 'Line', 'From Style', 'To Style', 'Hours Lost', 'Learning Days', 'Notes', ''].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Hours Lost', 'Learning Days'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
                ) : (changeovers as any[]).length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">No changeovers recorded yet.</td></tr>
                ) : (changeovers as any[]).map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 text-xs font-mono">{c.changeover_date}</td>
                    <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">L{c.lines?.line_number}</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">{c.from_style?.style_no || '—'}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{c.to_style?.style_no || '—'}</td>
                    <td className="py-2 px-3 text-right font-bold text-destructive">{Number(c.hours_lost).toFixed(1)}</td>
                    <td className="py-2 px-3 text-right">{c.learning_curve_days}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-[150px] truncate">{c.notes || '—'}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Record'} Style Changeover</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Line *</Label>
              <Select value={lineId} onValueChange={setLineId}><SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>{lines.map((l: any) => <SelectItem key={l.id} value={l.id}>L{l.line_number} — {l.floors?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From Style</Label>
                <Select value={fromStyleId} onValueChange={setFromStyleId}><SelectTrigger><SelectValue placeholder="Previous" /></SelectTrigger>
                  <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To Style *</Label>
                <Select value={toStyleId} onValueChange={setToStyleId}><SelectTrigger><SelectValue placeholder="New style" /></SelectTrigger>
                  <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={changeoverDate} onChange={e => setChangeoverDate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Hours Lost</Label><Input type="number" min={0} step={0.5} value={hoursLost} onChange={e => setHoursLost(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Learning Days</Label><Input type="number" min={0} value={learningDays} onChange={e => setLearningDays(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!lineId || !toStyleId || saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
