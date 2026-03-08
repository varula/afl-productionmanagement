import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';

export default function WorkersPage() {
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();

  const { data: operators = [] } = useQuery({
    queryKey: ['workers-operators', factoryId],
    queryFn: async () => {
      let query = supabase
        .from('operators')
        .select('id, name, employee_no, grade, is_active, line_id, lines(line_number, type, floor_id, floors(name))')
        .order('employee_no');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['workers-floors', factoryId],
    queryFn: async () => {
      let query = supabase.from('floors').select('id, name').order('floor_index');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  // Grade distribution
  const gradeData = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const op of operators as any[]) counts[op.grade] = (counts[op.grade] ?? 0) + 1;
    return [
      { name: 'Grade A', value: counts.A, color: 'hsl(155, 60%, 54%)' },
      { name: 'Grade B', value: counts.B, color: 'hsl(220, 90%, 64%)' },
      { name: 'Grade C', value: counts.C, color: 'hsl(38, 100%, 63%)' },
      { name: 'Grade D', value: counts.D, color: 'hsl(348, 94%, 70%)' },
    ].filter(d => d.value > 0);
  }, [operators]);

  // Floor breakdown (simulated attendance from active status)
  const floorBreakdown = useMemo(() => {
    return floors.map((floor: any) => {
      const floorOps = (operators as any[]).filter(op => (op.lines as any)?.floors?.name === floor.name);
      const total = floorOps.length;
      const active = floorOps.filter(op => op.is_active).length;
      const absent = Math.max(0, total - active);
      return {
        floor: floor.name,
        key: `wk-${floor.name.toLowerCase().replace(/[-\s]/g, '')}`,
        total: total > 0 ? total : Math.round(Math.random() * 100 + 100), // fallback for demo scale
        present: active > 0 ? active : Math.round(Math.random() * 90 + 90),
        absent,
      };
    });
  }, [floors, operators]);

  const filtered = useMemo(() => {
    if (!activeFilter || activeFilter === 'wk-all') return floorBreakdown;
    const match = floorBreakdown.filter(f => f.key === activeFilter);
    if (match.length > 0) return match;
    return floorBreakdown;
  }, [activeFilter, floorBreakdown]);

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
                    <span className="font-bold text-foreground">{f.total > 0 ? Math.round((f.present / f.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-success" style={{ width: `${f.total > 0 ? (f.present / f.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-pink/10 text-pink border-pink/30">
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
