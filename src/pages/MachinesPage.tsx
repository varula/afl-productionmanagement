import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const allMachines = [
  { id: 'SN-042', type: 'Overlock', line: 'Line 8', floor: 'SF-03', issue: 'Motor failure', since: '09:15', severity: 'critical', status: 'breakdown' },
  { id: 'SN-118', type: 'Flatlock', line: 'Line 3', floor: 'SF-01', issue: 'Needle break', since: '10:40', severity: 'warning', status: 'breakdown' },
  { id: 'SN-205', type: 'Lockstitch', line: 'Line 10', floor: 'FF-01', issue: 'Feed dog jam', since: '11:20', severity: 'critical', status: 'breakdown' },
  { id: 'SN-087', type: 'Lockstitch', line: 'Line 6', floor: 'SF-02', issue: 'Thread tension', since: '13:10', severity: 'warning', status: 'maintenance' },
  { id: 'SN-301', type: 'Pressing', line: 'Line 12', floor: 'FF-01', issue: 'Temp control', since: '14:00', severity: 'warning', status: 'maintenance' },
  { id: 'SN-150', type: 'Overlock', line: 'Line 1', floor: 'SF-01', issue: 'Looper timing', since: '15:00', severity: 'warning', status: 'maintenance' },
  { id: 'SN-220', type: 'Flatlock', line: 'Line 5', floor: 'SF-02', issue: 'Cover stitch skip', since: '08:30', severity: 'warning', status: 'maintenance' },
  { id: 'SN-330', type: 'Cutting', line: 'CF-01', floor: 'CF-01', issue: 'Blade dull', since: '09:45', severity: 'warning', status: 'maintenance' },
];

const floorUtilization = [
  { floor: 'SF-01', key: 'mc-sf01', total: 156, running: 154 },
  { floor: 'SF-02', key: 'mc-sf02', total: 152, running: 150 },
  { floor: 'SF-03', key: 'mc-sf03', total: 148, running: 147 },
  { floor: 'FF-01', key: 'mc-ff01', total: 68, running: 66 },
  { floor: 'FF-02', key: 'mc-ff02', total: 62, running: 61 },
  { floor: 'CF-01', key: 'mc-cf01', total: 62, running: 60 },
];

const floorFilterMap: Record<string, string> = {
  'mc-sf01': 'SF-01', 'mc-sf02': 'SF-02', 'mc-sf03': 'SF-03',
  'mc-ff01': 'FF-01', 'mc-ff02': 'FF-02', 'mc-cf01': 'CF-01',
};

const typeFilterMap: Record<string, string> = {
  'mct-lockstitch': 'Lockstitch', 'mct-overlock': 'Overlock', 'mct-flatlock': 'Flatlock',
  'mct-cutting': 'Cutting', 'mct-pressing': 'Pressing', 'mct-embroidery': 'Embroidery',
};

const sevColors: Record<string, string> = {
  critical: 'bg-pink/15 text-pink border-pink/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
};

export default function MachinesPage() {
  const activeFilter = useActiveFilter();

  const filteredMachines = useMemo(() => {
    if (!activeFilter || activeFilter === 'mc-all') return allMachines;
    if (activeFilter === 'mcs-running') return [];
    if (activeFilter === 'mcs-maint') return allMachines.filter(m => m.status === 'maintenance');
    if (activeFilter === 'mcs-breakdown') return allMachines.filter(m => m.status === 'breakdown');
    if (activeFilter === 'mcs-idle') return [];
    if (floorFilterMap[activeFilter]) return allMachines.filter(m => m.floor === floorFilterMap[activeFilter]);
    if (typeFilterMap[activeFilter]) return allMachines.filter(m => m.type === typeFilterMap[activeFilter]);
    return allMachines;
  }, [activeFilter]);

  const filteredFloors = useMemo(() => {
    if (!activeFilter || activeFilter === 'mc-all') return floorUtilization;
    if (floorFilterMap[activeFilter]) return floorUtilization.filter(f => f.key === activeFilter);
    return floorUtilization;
  }, [activeFilter]);

  const totalMachines = filteredFloors.reduce((s, f) => s + f.total, 0);
  const totalRunning = filteredFloors.reduce((s, f) => s + f.running, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent" /> Machine Tracker
        </h1>
        <p className="text-sm text-muted-foreground">{totalMachines} machines · {filteredMachines.length} issues shown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Machines', value: String(totalMachines), color: 'border-primary/20' },
          { label: 'Running', value: String(totalRunning), color: 'border-success/20' },
          { label: 'Down', value: String(filteredMachines.filter(m => m.status === 'breakdown').length), color: 'border-pink/20' },
          { label: 'Maintenance', value: String(filteredMachines.filter(m => m.status === 'maintenance').length), color: 'border-warning/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMachines.length > 0 && (
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-pink" /> Machines Down / Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filteredMachines.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20 hover:shadow-sm transition-shadow">
                <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{m.id} — {m.type}</p>
                  <p className="text-[10px] text-muted-foreground">{m.line} · {m.floor} · {m.issue} · Down since {m.since}</p>
                </div>
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
