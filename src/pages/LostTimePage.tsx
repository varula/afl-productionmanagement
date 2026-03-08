import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';

const reasonLabels: Record<string, string> = {
  machine_breakdown: 'Machine Breakdown',
  no_feeding: 'No Feeding',
  power_failure: 'Power Failure',
  style_changeover: 'Style Changeover',
  quality_issue: 'Quality Issue',
  material_shortage: 'Material Shortage',
  absenteeism: 'Absenteeism',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  other: 'Other',
};

const reasonColors: Record<string, string> = {
  machine_breakdown: 'hsl(348, 94%, 70%)',
  no_feeding: 'hsl(38, 100%, 63%)',
  quality_issue: 'hsl(255, 90%, 70%)',
  power_failure: 'hsl(220, 90%, 64%)',
  style_changeover: 'hsl(177, 58%, 50%)',
  maintenance: 'hsl(155, 60%, 54%)',
  material_shortage: 'hsl(348, 80%, 60%)',
  absenteeism: 'hsl(38, 80%, 55%)',
  meeting: 'hsl(220, 60%, 50%)',
  other: 'hsl(230, 15%, 55%)',
};

const severityColors: Record<string, string> = {
  critical: 'bg-pink/15 text-pink border-pink/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-primary/15 text-primary border-primary/30',
};

export default function LostTimePage() {
  const activeFilter = useActiveFilter();
  const today = new Date().toISOString().split('T')[0];

  const { data: downtimeEvents = [] } = useQuery({
    queryKey: ['lost-time-downtime', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('downtime')
        .select('*, lines(line_number, type, floor_id, floors(name))')
        .gte('occurred_at', `${today}T00:00:00`)
        .lte('occurred_at', `${today}T23:59:59`)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const incidents = useMemo(() => {
    return (downtimeEvents as any[]).map(d => ({
      id: d.id,
      line: `${(d.lines as any)?.type === 'cutting' ? 'Table' : 'Line'} ${(d.lines as any)?.line_number}`,
      floor: (d.lines as any)?.floors?.name || 'Unknown',
      reason: reasonLabels[d.reason] || d.reason,
      reasonKey: d.reason,
      minutes: d.minutes,
      time: new Date(d.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      severity: d.reason === 'machine_breakdown' ? 'critical' as const : d.minutes > 20 ? 'warning' as const : 'info' as const,
      resolved: d.minutes < 30,
    }));
  }, [downtimeEvents]);

  const reasonData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of downtimeEvents as any[]) {
      map.set(d.reason, (map.get(d.reason) ?? 0) + d.minutes);
    }
    return Array.from(map.entries())
      .map(([reason, minutes]) => ({
        reason: reasonLabels[reason] || reason,
        key: reason,
        minutes,
        color: reasonColors[reason] || 'hsl(230, 15%, 55%)',
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [downtimeEvents]);

  const filteredIncidents = useMemo(() => {
    if (!activeFilter || activeFilter === 'lt-all') return incidents;
    if (activeFilter === 'lt-open') return incidents.filter(i => !i.resolved);
    if (activeFilter === 'lt-resolved') return incidents.filter(i => i.resolved);
    if (activeFilter === 'lt-high') return incidents.filter(i => i.minutes > 30);
    // By reason key mapping
    const reasonKeyMap: Record<string, string> = {
      'lt-machine': 'machine_breakdown', 'lt-noinput': 'no_feeding', 'lt-qchold': 'quality_issue',
      'lt-power': 'power_failure', 'lt-needle': 'maintenance', 'lt-style': 'style_changeover', 'lt-meeting': 'meeting',
    };
    if (reasonKeyMap[activeFilter]) return incidents.filter(i => i.reasonKey === reasonKeyMap[activeFilter]);
    // By floor
    const floorMap: Record<string, string> = {
      'lt-sf01': 'SF-01', 'lt-sf02': 'SF-02', 'lt-sf03': 'SF-03',
      'lt-ff01': 'FF-01', 'lt-ff02': 'FF-02', 'lt-cf01': 'CF-01',
    };
    if (floorMap[activeFilter]) return incidents.filter(i => i.floor === floorMap[activeFilter]);
    return incidents;
  }, [activeFilter, incidents]);

  const totalMinutes = filteredIncidents.reduce((s, r) => s + r.minutes, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" /> Lost Time Tracker
        </h1>
        <p className="text-sm text-muted-foreground">Today · {filteredIncidents.length} incidents · {totalMinutes} total minutes lost</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Lost', value: `${totalMinutes} min`, color: 'border-pink/20' },
          { label: 'Incidents', value: String(filteredIncidents.length), color: 'border-warning/20' },
          { label: 'Critical', value: String(filteredIncidents.filter(i => i.severity === 'critical').length), color: 'border-destructive/20' },
          { label: 'Unresolved', value: String(filteredIncidents.filter(i => !i.resolved).length), color: 'border-primary/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Lost Time by Reason</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reasonData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                  {reasonData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{inc.line} — {inc.reason}</p>
                  <p className="text-[10px] text-muted-foreground">{inc.time} · {inc.minutes} min · {inc.floor}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${severityColors[inc.severity]}`}>{inc.severity}</Badge>
              </div>
            ))}
            {filteredIncidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No incidents match this filter</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
