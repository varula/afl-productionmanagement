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
import { UserCheck, UserX, Clock, Eye, PenLine, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-destructive/10 text-destructive',
  half_day: 'bg-warning/10 text-warning',
  leave: 'bg-muted text-muted-foreground',
};

export default function AttendancePage() {
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    operator_id: '', line_id: '', status: 'present', shift: 'day',
    check_in_time: '08:00', check_out_time: '17:00', remarks: '',
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['att-operators', factoryId],
    queryFn: async () => {
      let q = supabase.from('operators').select('id, name, employee_no, line_id').eq('is_active', true);
      if (factoryId) q = q.eq('factory_id', factoryId);
      const { data } = await q.order('name');
      return data ?? [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['att-lines'],
    queryFn: async () => {
      const { data } = await supabase.from('lines').select('id, line_number, floor_id');
      return data ?? [];
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', dateFilter, factoryId],
    queryFn: async () => {
      let q = supabase.from('attendance').select('*').eq('date', dateFilter);
      if (factoryId) q = q.eq('factory_id', factoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.operator_id || !factoryId) throw new Error('Select operator and factory');
      const { error } = await supabase.from('attendance').upsert({
        operator_id: form.operator_id,
        factory_id: factoryId,
        line_id: form.line_id || null,
        date: dateFilter,
        status: form.status,
        shift: form.shift,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        remarks: form.remarks || null,
      }, { onConflict: 'operator_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setDialogOpen(false);
      toast.success('Attendance saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const opMap = new Map(operators.map((o: any) => [o.id, o]));
  const present = attendance.filter((a: any) => a.status === 'present').length;
  const absent = attendance.filter((a: any) => a.status === 'absent').length;
  const halfDay = attendance.filter((a: any) => a.status === 'half_day').length;
  const total = operators.length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

  const filtered = attendance.filter((a: any) => {
    if (!searchTerm) return true;
    const op = opMap.get(a.operator_id);
    return op?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || op?.employee_no?.includes(searchTerm);
  });

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance</h1>
            <p className="text-xs text-muted-foreground">Daily operator attendance tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-40 h-8 text-xs" />
          <TabsList>
            <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
            <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Workers', value: total, color: 'text-foreground' },
          { label: 'Present', value: present, color: 'text-success' },
          { label: 'Absent', value: absent, color: 'text-destructive' },
          { label: 'Half Day', value: halfDay, color: 'text-warning' },
          { label: 'Attendance %', value: `${attendancePct}%`, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="border-[1.5px]">
            <CardContent className="p-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search by name or ID…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>
        <Card className="border-[1.5px]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Shift</TableHead>
                  <TableHead className="text-xs">Check In</TableHead>
                  <TableHead className="text-xs">Check Out</TableHead>
                  <TableHead className="text-xs">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm py-8 text-muted-foreground">No records for this date</TableCell></TableRow>
                ) : filtered.map((a: any) => {
                  const op = opMap.get(a.operator_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-medium">{op?.name || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{op?.employee_no || '—'}</TableCell>
                      <TableCell><Badge className={`text-xs ${STATUS_COLORS[a.status] || ''}`}>{a.status}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{a.shift}</TableCell>
                      <TableCell className="text-xs">{a.check_in_time || '—'}</TableCell>
                      <TableCell className="text-xs">{a.check_out_time || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.remarks || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="entry" className="mt-0">
        <Card className="border-[1.5px]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Mark Attendance</h2>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Record</Button>
            </div>
            <p className="text-xs text-muted-foreground">Select an operator and mark their attendance for {dateFilter}.</p>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Operator</Label>
                <Select value={form.operator_id} onValueChange={v => setForm(f => ({ ...f, operator_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select operator" /></SelectTrigger>
                  <SelectContent>{operators.map((o: any) => <SelectItem key={o.id} value={o.id} className="text-xs">{o.name} ({o.employee_no})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['present', 'absent', 'half_day', 'leave'].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['day', 'night', 'overtime'].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Line</Label>
                <Select value={form.line_id} onValueChange={v => setForm(f => ({ ...f, line_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{lines.map((l: any) => <SelectItem key={l.id} value={l.id} className="text-xs">Line {l.line_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check In</Label>
                <Input type="time" value={form.check_in_time} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check Out</Label>
                <Input type="time" value={form.check_out_time} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Remarks</Label>
                <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="h-8 text-xs" placeholder="Optional notes" />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
