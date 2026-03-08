import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const gradeData = [
  { name: 'Grade A', value: 480, color: 'hsl(155, 60%, 54%)' },
  { name: 'Grade B', value: 720, color: 'hsl(220, 90%, 64%)' },
  { name: 'Grade C', value: 420, color: 'hsl(38, 100%, 63%)' },
  { name: 'Grade D', value: 204, color: 'hsl(348, 94%, 70%)' },
];

const floorBreakdown = [
  { floor: 'SF-01', key: 'wk-sf01', total: 480, present: 462, absent: 18, leave: 6, training: 4 },
  { floor: 'SF-02', key: 'wk-sf02', total: 472, present: 454, absent: 18, leave: 5, training: 5 },
  { floor: 'SF-03', key: 'wk-sf03', total: 468, present: 444, absent: 24, leave: 4, training: 6 },
  { floor: 'FF-01', key: 'wk-ff01', total: 200, present: 192, absent: 8, leave: 3, training: 3 },
  { floor: 'FF-02', key: 'wk-ff02', total: 190, present: 184, absent: 6, leave: 2, training: 2 },
  { floor: 'CF-01', key: 'wk-cf01', total: 90, present: 88, absent: 2, leave: 2, training: 2 },
];

export default function WorkersPage() {
  const activeFilter = useActiveFilter();

  const filtered = useMemo(() => {
    if (!activeFilter || activeFilter === 'wk-all') return floorBreakdown;

    // By floor
    const floorMatch = floorBreakdown.filter(f => f.key === activeFilter);
    if (floorMatch.length > 0) return floorMatch;

    // By status — show all floors but highlight the stat
    if (activeFilter === 'wk-present' || activeFilter === 'wk-absent' || activeFilter === 'wk-leave' || activeFilter === 'wk-training') {
      return floorBreakdown;
    }

    return floorBreakdown;
  }, [activeFilter]);

  const statusHighlight = activeFilter?.startsWith('wk-') && ['wk-present', 'wk-absent', 'wk-leave', 'wk-training'].includes(activeFilter) ? activeFilter : null;

  const totalWorkers = filtered.reduce((s, f) => s + f.total, 0);
  const totalPresent = filtered.reduce((s, f) => s + f.present, 0);
  const totalAbsent = filtered.reduce((s, f) => s + f.absent, 0);
  const attendance = totalWorkers > 0 ? ((totalPresent / totalWorkers) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-purple" /> Worker Management
        </h1>
        <p className="text-sm text-muted-foreground">{totalWorkers.toLocaleString()} registered · {totalPresent.toLocaleString()} present today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Workers', value: totalWorkers.toLocaleString(), icon: Users, color: 'border-purple/20' },
          { label: 'Present', value: totalPresent.toLocaleString(), icon: UserCheck, color: 'border-success/20' },
          { label: 'Absent', value: totalAbsent.toLocaleString(), icon: UserX, color: 'border-pink/20' },
          { label: 'Attendance', value: `${attendance}%`, icon: TrendingUp, color: 'border-accent/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Operator Grade Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {gradeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Attendance by Floor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {filtered.map(f => (
              <div key={f.floor} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                <span className="text-sm font-bold text-foreground w-12">{f.floor}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span className="text-muted-foreground">{f.present}/{f.total} present</span>
                    <span className="font-bold text-foreground">{Math.round((f.present / f.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-success" style={{ width: `${(f.present / f.total) * 100}%` }} />
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusHighlight === 'wk-absent' ? 'bg-pink/20 text-pink border-pink/40 font-bold' : 'bg-pink/10 text-pink border-pink/30'}`}>
                  {f.absent} absent
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
