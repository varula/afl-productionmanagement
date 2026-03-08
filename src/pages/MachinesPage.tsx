import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, AlertTriangle, CheckCircle2, Wrench, Eye, PenLine } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DowntimeReason = Database['public']['Enums']['downtime_reason_type'];

const DOWNTIME_REASONS = [
  { value: 'machine_breakdown', label: 'Machine Breakdown' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'power_failure', label: 'Power Failure' },
  { value: 'other', label: 'Other' },
];

export default function MachinesPage() {
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [selectedLineId, setSelectedLineId] = useState('');
  const [reason, setReason] = useState<string>('machine_breakdown');
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: floors = [] } = useQuery({
    queryKey: ['machines-floors', factoryId],
    queryFn: async () => {
      let query = supabase.from('floors').select('id, name, lines(id, line_number, machine_count, type, is_active)').order('floor_index');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const allLines = useMemo(() => (floors as any[]).flatMap(f => (f.lines || []).filter((l: any) => l.is_active).map((l: any) => ({ ...l, floorName: f.name }))), [floors]);

  const { data: downtimeEvents = [] } = useQuery({
    queryKey: ['machines-downtime', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('downtime').select('*, lines(line_number, type, floor_id, floors(name))').gte('occurred_at', `${today}T00:00:00`).lte('occurred_at', `${today}T23:59:59`).order('occurred_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('downtime').insert({
        line_id: selectedLineId, reason: reason as DowntimeReason, minutes, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines-downtime'] });
      toast.success('Downtime event logged');
      setSelectedLineId(''); setMinutes(0); setNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const floorUtilization = useMemo(() => {
    return (floors as any[]).map(floor => {
      const lines = (floor.lines || []).filter((l: any) => l.is_active);
      const total = lines.reduce((s: number, l: any) => s + l.machine_count, 0);
      const floorDowntime = (downtimeEvents as any[]).filter(d => (d.lines as any)?.floors?.name === floor.name);
      const downCount = new Set(floorDowntime.map((d: any) => d.line_id)).size;
      return { floor: floor.name, key: `mc-${floor.name.toLowerCase().replace(/[-\s]/g, '')}`, total, running: Math.max(0, total - downCount) };
    });
  }, [floors, downtimeEvents]);

  const machines = useMemo(() => {
    return (downtimeEvents as any[]).map(d => ({
      id: `DT-${d.id.slice(0, 4).toUpperCase()}`, type: d.reason,
      line: `${(d.lines as any)?.type === 'cutting' ? 'Table' : 'Line'} ${(d.lines as any)?.line_number}`,
      floor: (d.lines as any)?.floors?.name || 'Unknown', issue: d.notes || d.reason.replace(/_/g, ' '),
      since: new Date(d.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      severity: d.reason === 'machine_breakdown' ? 'critical' : 'warning',
      status: d.reason === 'machine_breakdown' ? 'breakdown' : 'maintenance', minutes: d.minutes,
    }));
  }, [downtimeEvents]);

  const floorFilterMap: Record<string, string> = {};
  for (const f of floorUtilization) floorFilterMap[f.key] = f.floor;

  const filteredMachines = useMemo(() => {
    if (!activeFilter || activeFilter === 'mc-all') return machines;
    if (activeFilter === 'mcs-running') return [];
    if (activeFilter === 'mcs-maint') return machines.filter(m => m.status === 'maintenance');
    if (activeFilter === 'mcs-breakdown') return machines.filter(m => m.status === 'breakdown');
    if (activeFilter === 'mcs-idle') return [];
    if (floorFilterMap[activeFilter]) return machines.filter(m => m.floor === floorFilterMap[activeFilter]);
    return machines;
  }, [activeFilter, machines, floorFilterMap]);

  const filteredFloors = useMemo(() => {
    if (!activeFilter || activeFilter === 'mc-all') return floorUtilization;
    if (floorFilterMap[activeFilter]) return floorUtilization.filter(f => f.key === activeFilter);
    return floorUtilization;
  }, [activeFilter, floorUtilization, floorFilterMap]);

  const totalMachines = filteredFloors.reduce((s, f) => s + f.total, 0);
  const totalRunning = filteredFloors.reduce((s, f) => s + f.running, 0);
  const sevColors: Record<string, string> = { critical: 'bg-pink/15 text-pink border-pink/30', warning: 'bg-warning/15 text-warning border-warning/30' };

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Cpu className="h-5 w-5 text-accent" /> Machine Tracker</h1>
          <p className="text-sm text-muted-foreground">{totalMachines} machines · {filteredMachines.length} issues</p>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Machines', value: String(totalMachines), color: 'border-primary/20' },
            { label: 'Running', value: String(totalRunning), color: 'border-success/20' },
            { label: 'Down', value: String(filteredMachines.filter(m => m.status === 'breakdown').length), color: 'border-pink/20' },
            { label: 'Maintenance', value: String(filteredMachines.filter(m => m.status === 'maintenance').length), color: 'border-warning/20' },
          ].map(s => (
            <Card key={s.label} className={`border-[1.5px] ${s.color}`}><CardContent className="p-3 text-center"><p className="text-lg font-extrabold text-foreground">{s.value}</p><p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p></CardContent></Card>
          ))}
        </div>
        {filteredMachines.length > 0 && (
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-pink" /> Downtime Events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {filteredMachines.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20 hover:shadow-sm transition-shadow animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-foreground">{m.line} — {m.type.replace(/_/g, ' ')}</p><p className="text-[10px] text-muted-foreground">{m.floor} · {m.issue} · {m.minutes} min · {m.since}</p></div>
                  <Badge variant="outline" className={`text-[10px] ${sevColors[m.severity]}`}>{m.severity}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Machine Utilization by Floor</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredFloors.map(f => (
                <div key={f.floor} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{f.floor}</p>
                  <p className="text-lg font-extrabold text-success">{f.total > 0 ? Math.round((f.running / f.total) * 100) : 0}%</p>
                  <p className="text-[10px] text-muted-foreground">{f.running}/{f.total} running</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="entry" className="space-y-4 mt-0">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Log Machine Downtime</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Line / Table</Label>
                <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                  <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent>
                    {allLines.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.type === 'cutting' ? 'Table' : 'Line'} {l.line_number} — {l.floorName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOWNTIME_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Minutes Lost</Label>
                <Input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
            <Button className="mt-4" onClick={() => addMutation.mutate()} disabled={!selectedLineId || minutes <= 0 || addMutation.isPending}>
              {addMutation.isPending ? 'Saving...' : 'Log Downtime'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
