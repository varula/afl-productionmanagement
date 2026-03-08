import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const reasonData = [
  { reason: 'Machine Breakdown', key: 'lt-machine', minutes: 778, color: 'hsl(348, 94%, 70%)' },
  { reason: 'No Feeding', key: 'lt-noinput', minutes: 518, color: 'hsl(38, 100%, 63%)' },
  { reason: 'Quality Issue', key: 'lt-qchold', minutes: 333, color: 'hsl(255, 90%, 70%)' },
  { reason: 'Power Failure', key: 'lt-power', minutes: 92, color: 'hsl(220, 90%, 64%)' },
  { reason: 'Style Changeover', key: 'lt-style', minutes: 74, color: 'hsl(177, 58%, 50%)' },
  { reason: 'Maintenance', key: 'lt-meeting', minutes: 55, color: 'hsl(155, 60%, 54%)' },
];

const incidents = [
  { id: 1, line: 'Line 8', floor: 'SF-03', reason: 'Machine Breakdown', reasonKey: 'lt-machine', minutes: 45, time: '09:30', severity: 'critical', resolved: false },
  { id: 2, line: 'Line 3', floor: 'SF-01', reason: 'No Feeding', reasonKey: 'lt-noinput', minutes: 30, time: '10:15', severity: 'warning', resolved: true },
  { id: 3, line: 'Line 6', floor: 'SF-02', reason: 'Quality Issue', reasonKey: 'lt-qchold', minutes: 25, time: '11:00', severity: 'warning', resolved: true },
  { id: 4, line: 'Line 10', floor: 'FF-01', reason: 'Machine Breakdown', reasonKey: 'lt-machine', minutes: 40, time: '11:45', severity: 'critical', resolved: false },
  { id: 5, line: 'Line 1', floor: 'SF-01', reason: 'Power Failure', reasonKey: 'lt-power', minutes: 15, time: '13:00', severity: 'info', resolved: true },
  { id: 6, line: 'Line 5', floor: 'SF-02', reason: 'Style Changeover', reasonKey: 'lt-style', minutes: 20, time: '14:30', severity: 'info', resolved: true },
];

const floorFilterMap: Record<string, string> = {
  'lt-sf01': 'SF-01', 'lt-sf02': 'SF-02', 'lt-sf03': 'SF-03',
  'lt-ff01': 'FF-01', 'lt-ff02': 'FF-02', 'lt-cf01': 'CF-01',
};

const severityColors: Record<string, string> = {
  critical: 'bg-pink/15 text-pink border-pink/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-primary/15 text-primary border-primary/30',
};

export default function LostTimePage() {
  const activeFilter = useActiveFilter();

  const filteredIncidents = useMemo(() => {
    if (!activeFilter || activeFilter === 'lt-all') return incidents;
    if (activeFilter === 'lt-open') return incidents.filter(i => !i.resolved);
    if (activeFilter === 'lt-resolved') return incidents.filter(i => i.resolved);
    if (activeFilter === 'lt-high') return incidents.filter(i => i.minutes > 30);
    if (floorFilterMap[activeFilter]) return incidents.filter(i => i.floor === floorFilterMap[activeFilter]);
    // By reason
    const reasonMatch = reasonData.find(r => r.key === activeFilter);
    if (reasonMatch) return incidents.filter(i => i.reasonKey === activeFilter);
    return incidents;
  }, [activeFilter]);

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
            {filteredIncidents.map(inc => (
              <div key={inc.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-muted/20">
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
