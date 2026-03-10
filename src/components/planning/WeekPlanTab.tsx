import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Target, TrendingUp, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

interface WeekPlanTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function WeekPlanTab({ factoryId, selectedDate, department }: WeekPlanTabProps) {
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: lines = [] } = useQuery({
    queryKey: ['week-plan-lines', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floor_id, operator_count, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const lineIds = lines.map((l: any) => l.id);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['week-plans', weekStartStr, weekEndStr, department],
    queryFn: async () => {
      if (!lineIds.length) return [];
      const { data } = await supabase
        .from('production_plans')
        .select('*, lines(line_number, floors(name)), styles(style_no, buyer, smv)')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .in('line_id', lineIds)
        .order('date');
      return data ?? [];
    },
    enabled: lineIds.length > 0,
  });

  const planIds = (plans as any[]).map(p => p.id);
  const { data: hourly = [] } = useQuery({
    queryKey: ['week-plan-hourly', planIds],
    queryFn: async () => {
      if (!planIds.length) return [];
      const { data } = await supabase.from('hourly_production').select('plan_id, produced_qty').in('plan_id', planIds);
      return data ?? [];
    },
    enabled: planIds.length > 0,
  });

  const outputByPlan = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hourly as any[]) m.set(h.plan_id, (m.get(h.plan_id) ?? 0) + h.produced_qty);
    return m;
  }, [hourly]);

  // Group by line, then by day
  const lineWeekData = useMemo(() => {
    const lineMap = new Map<string, { line: any; days: Map<string, { target: number; output: number; style: string; buyer: string }> }>();
    for (const l of lines as any[]) {
      lineMap.set(l.id, { line: l, days: new Map() });
    }
    for (const p of plans as any[]) {
      const entry = lineMap.get(p.line_id);
      if (!entry) continue;
      const output = outputByPlan.get(p.id) ?? 0;
      const existing = entry.days.get(p.date) || { target: 0, output: 0, style: '', buyer: '' };
      existing.target += p.target_qty;
      existing.output += output;
      existing.style = p.styles?.style_no || '';
      existing.buyer = p.styles?.buyer || '';
      entry.days.set(p.date, existing);
    }
    return Array.from(lineMap.values()).sort((a, b) => (a.line?.line_number || 0) - (b.line?.line_number || 0));
  }, [lines, plans, outputByPlan]);

  const totalTarget = (plans as any[]).reduce((s, p) => s + p.target_qty, 0);
  const totalOutput = Array.from(outputByPlan.values()).reduce((s, v) => s + v, 0);
  const plannedDays = new Set((plans as any[]).map(p => p.date)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Week', value: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`, icon: CalendarDays, color: 'text-primary' },
          { label: 'Total Target', value: totalTarget.toLocaleString(), icon: Target, color: 'text-success' },
          { label: 'Total Output', value: totalOutput.toLocaleString(), icon: TrendingUp, color: 'text-accent' },
          { label: 'Days Planned', value: `${plannedDays} / 7`, icon: Users, color: 'text-primary' },
        ].map(k => (
          <Card key={k.label} className="border-[1.5px]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</span>
              </div>
              <p className="text-lg font-extrabold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Weekly Line × Day Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold sticky left-0 bg-background z-10">Line</th>
                  {weekDays.map(d => (
                    <th key={d.toISOString()} className="text-center py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold min-w-[100px]">
                      {format(d, 'EEE')}<br />{format(d, 'MMM d')}
                    </th>
                  ))}
                  <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Week Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : lineWeekData.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No lines found</td></tr>
                ) : lineWeekData.map(({ line, days }) => {
                  const weekTarget = Array.from(days.values()).reduce((s, d) => s + d.target, 0);
                  const weekOutput = Array.from(days.values()).reduce((s, d) => s + d.output, 0);
                  return (
                    <tr key={line.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 sticky left-0 bg-background z-10">
                        <Badge variant="outline" className="text-[10px] font-bold">L{line.line_number}</Badge>
                        <span className="text-muted-foreground ml-1">{line.floors?.name}</span>
                      </td>
                      {weekDays.map(d => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const dayData = days.get(dateStr);
                        if (!dayData) return <td key={dateStr} className="py-2 px-1.5 text-center text-muted-foreground/40">—</td>;
                        const pct = dayData.target > 0 ? Math.min(100, Math.round((dayData.output / dayData.target) * 100)) : 0;
                        return (
                          <td key={dateStr} className="py-1.5 px-1.5">
                            <div className="text-center space-y-0.5">
                              <p className="text-[10px] text-muted-foreground truncate">{dayData.style}</p>
                              <p className="font-bold text-foreground">{dayData.target.toLocaleString()}</p>
                              {dayData.output > 0 && (
                                <div className="flex items-center gap-1">
                                  <Progress value={pct} className="h-1 flex-1" />
                                  <span className="text-[9px] font-bold text-muted-foreground">{pct}%</span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-right">
                        <p className="font-bold text-foreground">{weekTarget.toLocaleString()}</p>
                        {weekOutput > 0 && <p className="text-[10px] text-muted-foreground">{weekOutput.toLocaleString()} out</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
