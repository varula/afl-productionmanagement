import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, Eye, PenLine } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DowntimeReason = Database['public']['Enums']['downtime_reason_type'];

const reasonLabels: Record<string, string> = {
  machine_breakdown: 'Machine Breakdown', no_feeding: 'No Feeding', power_failure: 'Power Failure',
  style_changeover: 'Style Changeover', quality_issue: 'Quality Issue', material_shortage: 'Material Shortage',
  absenteeism: 'Absenteeism', meeting: 'Meeting', maintenance: 'Maintenance', other: 'Other',
};
const reasonColors: Record<string, string> = {
  machine_breakdown: 'hsl(348, 94%, 70%)', no_feeding: 'hsl(38, 100%, 63%)', quality_issue: 'hsl(255, 90%, 70%)',
  power_failure: 'hsl(220, 90%, 64%)', style_changeover: 'hsl(177, 58%, 50%)', maintenance: 'hsl(155, 60%, 54%)',
  material_shortage: 'hsl(348, 80%, 60%)', absenteeism: 'hsl(38, 80%, 55%)', meeting: 'hsl(220, 60%, 50%)', other: 'hsl(230, 15%, 55%)',
};
const severityColors: Record<string, string> = { critical: 'bg-pink/15 text-pink border-pink/30', warning: 'bg-warning/15 text-warning border-warning/30', info: 'bg-primary/15 text-primary border-primary/30' };

const ALL_REASONS = Object.entries(reasonLabels).map(([value, label]) => ({ value, label }));

export default function LostTimePage() {
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [selectedLineId, setSelectedLineId] = useState('');
  const [reason, setReason] = useState<string>('no_feeding');
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: lines = [] } = useQuery({
    queryKey: ['lt-lines', factoryId],
    queryFn: async () => {
      const { data: floorData } = await supabase.from('floors').select('id, name').eq('factory_id', factoryId);
      if (!floorData?.length) return [];
      const { data, error } = await supabase.from('lines').select('id, line_number, type, floors(name)').in('floor_id', floorData.map(f => f.id)).eq('is_active', true).order('line_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: downtimeEvents = [] } = useQuery({
    queryKey: ['lost-time-downtime', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('downtime').select('*, lines(line_number, type, floor_id, floors(name))').gte('occurred_at', `${today}T00:00:00`).lte('occurred_at', `${today}T23:59:59`).order('occurred_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('downtime').insert({ line_id: selectedLineId, reason: reason as DowntimeReason, minutes, notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-time-downtime'] });
      toast.success('Lost time incident logged');
      setSelectedLineId(''); setMinutes(0); setNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const incidents = useMemo(() => {
    return (downtimeEvents as any[]).map(d => ({
      id: d.id, line: `${(d.lines as any)?.type === 'cutting' ? 'Table' : 'Line'} ${(d.lines as any)?.line_number}`,
      floor: (d.lines as any)?.floors?.name || 'Unknown', reason: reasonLabels[d.reason] || d.reason, reasonKey: d.reason,
      minutes: d.minutes, time: new Date(d.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      severity: d.reason === 'machine_breakdown' ? 'critical' as const : d.minutes > 20 ? 'warning' as const : 'info' as const,
      resolved: d.minutes < 30,
    }));
  }, [downtimeEvents]);

  const reasonData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of downtimeEvents as any[]) map.set(d.reason, (map.get(d.reason) ?? 0) + d.minutes);
    return Array.from(map.entries()).map(([r, m]) => ({ reason: reasonLabels[r] || r, key: r, minutes: m, color: reasonColors[r] || 'hsl(230, 15%, 55%)' })).sort((a, b) => b.minutes - a.minutes);
  }, [downtimeEvents]);

  const filteredIncidents = useMemo(() => {
    if (!activeFilter || activeFilter === 'lt-all') return incidents;
    if (activeFilter === 'lt-open') return incidents.filter(i => !i.resolved);
    if (activeFilter === 'lt-resolved') return incidents.filter(i => i.resolved);
    if (activeFilter === 'lt-high') return incidents.filter(i => i.minutes > 30);
    const reasonKeyMap: Record<string, string> = { 'lt-machine': 'machine_breakdown', 'lt-noinput': 'no_feeding', 'lt-qchold': 'quality_issue', 'lt-power': 'power_failure', 'lt-needle': 'maintenance', 'lt-style': 'style_changeover', 'lt-meeting': 'meeting' };
    if (reasonKeyMap[activeFilter]) return incidents.filter(i => i.reasonKey === reasonKeyMap[activeFilter]);
    const floorMap: Record<string, string> = { 'lt-sf01': 'SF-01', 'lt-sf02': 'SF-02', 'lt-sf03': 'SF-03', 'lt-ff01': 'FF-01', 'lt-ff02': 'FF-02', 'lt-cf01': 'CF-01' };
    if (floorMap[activeFilter]) return incidents.filter(i => i.floor === floorMap[activeFilter]);
    return incidents;
  }, [activeFilter, incidents]);

  const totalMinutes = filteredIncidents.reduce((s, r) => s + r.minutes, 0);

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Lost Time Tracker</h1>
          <p className="text-sm text-muted-foreground">Today · {filteredIncidents.length} incidents · {totalMinutes} total minutes lost</p>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Lost', value: `${totalMinutes} min`, color: 'border-pink/20' },
            { label: 'Incidents', value: String(filteredIncidents.length), color: 'border-warning/20' },
            { label: 'Critical', value: String(filteredIncidents.filter(i => i.severity === 'critical').length), color: 'border-destructive/20' },
            { label: 'Unresolved', value: String(filteredIncidents.filter(i => !i.resolved).length), color: 'border-primary/20' },
          ].map(s => (
            <Card key={s.label} className={`border-[1.5px] ${s.color}`}><CardContent className="p-3 text-center"><p className="text-lg font-extrabold text-foreground">{s.value}</p><p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Lost Time by Reason</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reasonData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={80} /><Tooltip />
                  <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>{reasonData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Incidents ({filteredIncidents.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {filteredIncidents.map((inc, i) => (
                <div key={inc.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-muted/20 animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-foreground">{inc.line} — {inc.reason}</p><p className="text-[10px] text-muted-foreground">{inc.time} · {inc.minutes} min · {inc.floor}</p></div>
                  <Badge variant="outline" className={`text-[10px] ${severityColors[inc.severity]}`}>{inc.severity}</Badge>
                </div>
              ))}
              {filteredIncidents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No incidents match this filter</p>}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="entry" className="space-y-4 mt-0">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Log Lost Time Incident</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Line / Table</Label>
                <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                  <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent>
                    {(lines as any[]).map(l => <SelectItem key={l.id} value={l.id}>{l.type === 'cutting' ? 'Table' : 'Line'} {l.line_number} — {(l.floors as any)?.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Minutes Lost</Label>
                <Input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional details" />
              </div>
            </div>
            <Button className="mt-4" onClick={() => addMutation.mutate()} disabled={!selectedLineId || minutes <= 0 || addMutation.isPending}>
              {addMutation.isPending ? 'Saving...' : 'Log Incident'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
