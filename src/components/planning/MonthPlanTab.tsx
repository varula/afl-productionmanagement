import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, startOfWeek, parseISO } from 'date-fns';

interface MonthPlanTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function MonthPlanTab({ factoryId, selectedDate, department }: MonthPlanTabProps) {
  const monthStart = startOfMonth(parseISO(selectedDate));
  const monthEnd = endOfMonth(parseISO(selectedDate));
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const weeks = useMemo(() => {
    // Week starts on Saturday (6), ends on Thursday (Sat + 5 days)
    const starts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 6 });
    return starts.map(ws => {
      const wEnd = addDays(ws, 5); // Saturday + 5 = Thursday
      return {
        start: ws < monthStart ? monthStart : ws,
        end: wEnd > monthEnd ? monthEnd : wEnd,
      };
    });
  }, [monthStart, monthEnd]);

  const { data: lines = [] } = useQuery({
    queryKey: ['month-plan-lines', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const lineIds = lines.map((l: any) => l.id);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['month-plans', monthStartStr, monthEndStr, department],
    queryFn: async () => {
      if (!lineIds.length) return [];
      const { data } = await supabase
        .from('production_plans')
        .select('date, line_id, target_qty, styles(style_no, buyer)')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .in('line_id', lineIds);
      return data ?? [];
    },
    enabled: lineIds.length > 0,
  });

  // Aggregate by week
  const weekSummaries = useMemo(() => {
    return weeks.map((w, i) => {
      const wStart = format(w.start, 'yyyy-MM-dd');
      const wEnd = format(w.end, 'yyyy-MM-dd');
      const weekPlans = (plans as any[]).filter(p => p.date >= wStart && p.date <= wEnd);
      const totalTarget = weekPlans.reduce((s, p) => s + p.target_qty, 0);
      const linesPlanned = new Set(weekPlans.map(p => p.line_id)).size;
      const daysPlanned = new Set(weekPlans.map(p => p.date)).size;
      const styleSet = new Set(weekPlans.map(p => p.styles?.style_no).filter(Boolean));
      return { weekNum: i + 1, start: w.start, end: w.end, totalTarget, linesPlanned, daysPlanned, styles: Array.from(styleSet) };
    });
  }, [weeks, plans]);

  // Style-wise monthly summary
  const styleSummary = useMemo(() => {
    const map = new Map<string, { style: string; buyer: string; totalTarget: number; daysPlanned: number; lineSet: Set<string> }>();
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || 'Unknown';
      const existing = map.get(key) || { style: key, buyer: p.styles?.buyer || '', totalTarget: 0, daysPlanned: 0, lineSet: new Set<string>() };
      existing.totalTarget += p.target_qty;
      existing.lineSet.add(p.line_id);
      map.set(key, existing);
    }
    // Count days per style
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || 'Unknown';
      const existing = map.get(key)!;
      existing.daysPlanned = new Set((plans as any[]).filter(pp => (pp.styles?.style_no || 'Unknown') === key).map(pp => pp.date)).size;
    }
    return Array.from(map.values()).sort((a, b) => b.totalTarget - a.totalTarget);
  }, [plans]);

  const totalMonthTarget = (plans as any[]).reduce((s, p) => s + p.target_qty, 0);
  const totalDaysPlanned = new Set((plans as any[]).map(p => p.date)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Month', value: format(monthStart, 'MMMM yyyy'), icon: CalendarDays, color: 'text-primary' },
          { label: 'Monthly Target', value: totalMonthTarget.toLocaleString(), icon: Target, color: 'text-success' },
          { label: 'Days Planned', value: String(totalDaysPlanned), icon: TrendingUp, color: 'text-accent' },
          { label: 'Styles Running', value: String(styleSummary.length), icon: BarChart3, color: 'text-primary' },
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

      {/* Weekly breakdown */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Week', 'Period', 'Lines', 'Days', 'Styles', 'Target'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Lines', 'Days', 'Target'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : weekSummaries.map(w => (
                  <tr key={w.weekNum} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">W{w.weekNum}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{format(w.start, 'MMM d')} – {format(w.end, 'MMM d')}</td>
                    <td className="py-2.5 px-3 text-right">{w.linesPlanned}</td>
                    <td className="py-2.5 px-3 text-right">{w.daysPlanned}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {w.styles.slice(0, 4).map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
                        {w.styles.length > 4 && <Badge variant="outline" className="text-[9px]">+{w.styles.length - 4}</Badge>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{w.totalTarget.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Style-wise summary */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold">Style-wise Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Style', 'Buyer', 'Lines', 'Days Planned', 'Monthly Target', 'Share'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Lines', 'Days Planned', 'Monthly Target'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {styleSummary.map(s => {
                  const share = totalMonthTarget > 0 ? Math.round((s.totalTarget / totalMonthTarget) * 100) : 0;
                  return (
                    <tr key={s.style} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium text-foreground">{s.style}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{s.buyer}</td>
                      <td className="py-2.5 px-3 text-right">{s.lineSet.size}</td>
                      <td className="py-2.5 px-3 text-right">{s.daysPlanned}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{s.totalTarget.toLocaleString()}</td>
                      <td className="py-2.5 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={share} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-bold text-muted-foreground w-7 text-right">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {styleSummary.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No plans for this month</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
