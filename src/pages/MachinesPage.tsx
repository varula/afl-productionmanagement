import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';

const machineStats = [
  { label: 'Total Machines', value: '648', color: 'border-primary/20' },
  { label: 'Running', value: '638', color: 'border-success/20' },
  { label: 'Down', value: '5', color: 'border-pink/20' },
  { label: 'Maintenance', value: '5', color: 'border-warning/20' },
];

const downMachines = [
  { id: 'SN-042', type: 'Overlock', line: 'Line 8', issue: 'Motor failure', since: '09:15', severity: 'critical' },
  { id: 'SN-118', type: 'Flatlock', line: 'Line 3', issue: 'Needle break', since: '10:40', severity: 'warning' },
  { id: 'SN-205', type: 'Single Needle', line: 'Line 10', issue: 'Feed dog jam', since: '11:20', severity: 'critical' },
  { id: 'SN-087', type: 'Button Hole', line: 'Line 6', issue: 'Thread tension', since: '13:10', severity: 'warning' },
  { id: 'SN-301', type: 'Iron Press', line: 'Line 12', issue: 'Temp control', since: '14:00', severity: 'warning' },
];

const sevColors: Record<string, string> = {
  critical: 'bg-pink/15 text-pink border-pink/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
};

export default function MachinesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent" /> Machine Tracker
        </h1>
        <p className="text-sm text-muted-foreground">648 machines across 12 lines</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {machineStats.map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-pink" /> Machines Down</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {downMachines.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20 hover:shadow-sm transition-shadow">
              <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">{m.id} — {m.type}</p>
                <p className="text-[10px] text-muted-foreground">{m.line} · {m.issue} · Down since {m.since}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${sevColors[m.severity]}`}>{m.severity}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Machine Utilization by Floor</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { floor: 'SF-01', total: 120, running: 118 },
              { floor: 'SF-02', total: 120, running: 116 },
              { floor: 'SF-03', total: 117, running: 113 },
              { floor: 'FF-01', total: 91, running: 88 },
            ].map(f => (
              <div key={f.floor} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <p className="text-sm font-bold text-foreground">{f.floor}</p>
                <p className="text-lg font-extrabold text-success">{Math.round((f.running / f.total) * 100)}%</p>
                <p className="text-[10px] text-muted-foreground">{f.running}/{f.total} running</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
