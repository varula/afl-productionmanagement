import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, eachDayOfInterval } from 'date-fns';
import { DeptComparisonChart } from '@/components/planning/DeptComparisonChart';
import {
  Scissors, Shirt, PackageCheck, CalendarDays, Plus, Target, TrendingUp, Users, Clock, Calendar as CalendarIcon,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DeptKey = 'cutting' | 'sewing' | 'finishing';
type ViewMode = 'daily' | 'weekly' | 'monthly';

const DEPT_CONFIG: Record<DeptKey, { label: string; icon: React.ElementType; color: string; badgeClass: string }> = {
  cutting: { label: 'Cutting', icon: Scissors, color: 'text-primary', badgeClass: 'bg-primary/10 text-primary border-primary/30' },
  sewing: { label: 'Sewing', icon: Shirt, color: 'text-purple-500', badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  finishing: { label: 'Finishing', icon: PackageCheck, color: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
};

function getDateRange(date: Date, mode: ViewMode): { start: string; end: string; label: string } {
  if (mode === 'daily') {
    const d = format(date, 'yyyy-MM-dd');
    return { start: d, end: d, label: format(date, 'EEE, MMM d, yyyy') };
  }
  if (mode === 'weekly') {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd'), label: `${format(s, 'MMM d')} — ${format(e, 'MMM d, yyyy')}` };
  }
  const s = startOfMonth(date);
  const e = endOfMonth(date);
  return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd'), label: format(date, 'MMMM yyyy') };
}

export default function PlanningModule() {
  const factoryId = useFactoryId();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const dateRange = useMemo(() => getDateRange(selectedDate, viewMode), [selectedDate, viewMode]);

  // Fetch plans for date range
  const { data: plans = [] } = useQuery({
    queryKey: ['planning-module-plans', dateRange.start, dateRange.end],
    queryFn: async () => {
      let query = supabase
        .from('production_plans')
        .select('id, date, line_id, target_qty, planned_operators, planned_helpers, working_hours, planned_efficiency, target_efficiency, lines(line_number, type, floor_id, floors(name)), styles(style_no, buyer, smv)')
        .order('created_at');
      if (dateRange.start === dateRange.end) {
        query = query.eq('date', dateRange.start);
      } else {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch hourly output
  const planIds = (plans as any[]).map(p => p.id);
  const { data: hourly = [] } = useQuery({
    queryKey: ['planning-module-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      // Batch in chunks of 100 to avoid URL limits
      const chunks: string[][] = [];
      for (let i = 0; i < planIds.length; i += 100) chunks.push(planIds.slice(i, i + 100));
      const results: any[] = [];
      for (const chunk of chunks) {
        const { data, error } = await supabase.from('hourly_production').select('plan_id, produced_qty, operators_present, helpers_present').in('plan_id', chunk);
        if (error) throw error;
        results.push(...(data ?? []));
      }
      return results;
    },
    enabled: planIds.length > 0,
  });

  // Build output map
  const outputByPlan = useMemo(() => {
    const map = new Map<string, { output: number; maxOps: number; maxHelpers: number }>();
    for (const h of hourly as any[]) {
      const existing = map.get(h.plan_id) || { output: 0, maxOps: 0, maxHelpers: 0 };
      existing.output += h.produced_qty;
      existing.maxOps = Math.max(existing.maxOps, h.operators_present || 0);
      existing.maxHelpers = Math.max(existing.maxHelpers, h.helpers_present || 0);
      map.set(h.plan_id, existing);
    }
    return map;
  }, [hourly]);

  // Group plans by department
  const grouped = useMemo(() => {
    const groups: Record<DeptKey, any[]> = { cutting: [], sewing: [], finishing: [] };
    for (const plan of plans as any[]) {
      const lineType = plan.lines?.type || 'sewing';
      const dept: DeptKey = lineType === 'cutting' ? 'cutting' : lineType === 'finishing' ? 'finishing' : 'sewing';
      const stats = outputByPlan.get(plan.id) || { output: 0, maxOps: 0, maxHelpers: 0 };
      const progress = plan.target_qty > 0 ? Math.min(100, Math.round((stats.output / plan.target_qty) * 100)) : 0;
      groups[dept].push({ ...plan, output: stats.output, progress, presentOps: stats.maxOps, presentHelpers: stats.maxHelpers });
    }
    for (const key of Object.keys(groups) as DeptKey[]) {
      groups[key].sort((a: any, b: any) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0));
    }
    return groups;
  }, [plans, outputByPlan]);

  const getSummary = (deptPlans: any[]) => {
    const totalTarget = deptPlans.reduce((s, p) => s + p.target_qty, 0);
    const totalOutput = deptPlans.reduce((s, p) => s + p.output, 0);
    const totalOps = deptPlans.reduce((s, p) => s + (p.planned_operators || 0), 0);
    const avgProgress = deptPlans.length > 0 ? Math.round(deptPlans.reduce((s, p) => s + p.progress, 0) / deptPlans.length) : 0;
    const avgEfficiency = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;
    return { totalTarget, totalOutput, totalOps, avgProgress, lineCount: deptPlans.length, avgEfficiency };
  };

  const cuttingSummary = getSummary(grouped.cutting);
  const sewingSummary = getSummary(grouped.sewing);
  const finishingSummary = getSummary(grouped.finishing);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Planning Module
          </h1>
          <p className="text-sm text-muted-foreground">
            Department-wise production plan overview — <span className="font-medium text-foreground">{dateRange.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 capitalize transition-colors',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <CalendarDays className="h-3.5 w-3.5" />
                {viewMode === 'daily' ? format(selectedDate, 'MMM d') : viewMode === 'weekly' ? `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}` : format(selectedDate, 'MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button size="sm" variant="outline" onClick={() => navigate('/plans/new')} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> New Plan
          </Button>
        </div>
      </div>

      {/* Cross-Department Comparison Chart */}
      <DeptComparisonChart cutting={cuttingSummary} sewing={sewingSummary} finishing={finishingSummary} />

      {/* Department Tabs */}
      <Tabs defaultValue="sewing">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          {(Object.keys(DEPT_CONFIG) as DeptKey[]).map((key) => {
            const cfg = DEPT_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] min-w-[18px] justify-center">
                  {grouped[key].length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(DEPT_CONFIG) as DeptKey[]).map((deptKey) => {
          const cfg = DEPT_CONFIG[deptKey];
          const deptPlans = grouped[deptKey];
          const summary = getSummary(deptPlans);

          return (
            <TabsContent key={deptKey} value={deptKey} className="space-y-4 mt-4">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Lines', value: summary.lineCount, icon: Shirt },
                  { label: 'Total Target', value: summary.totalTarget.toLocaleString(), icon: Target },
                  { label: 'Total Output', value: summary.totalOutput.toLocaleString(), icon: TrendingUp },
                  { label: 'Manpower', value: summary.totalOps, icon: Users },
                  { label: 'Avg Progress', value: `${summary.avgProgress}%`, icon: Clock },
                ].map((kpi) => (
                  <Card key={kpi.label} className="border-[1.5px]">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <kpi.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{kpi.label}</span>
                      </div>
                      <p className="text-lg font-extrabold text-foreground">{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Plans Table */}
              <Card className="border-[1.5px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                    <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                    {cfg.label} Plans — {dateRange.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {viewMode !== 'daily' && <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Date</th>}
                          <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Line</th>
                          <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Floor</th>
                          <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Style</th>
                          <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Buyer</th>
                          <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">SMV</th>
                          <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Target</th>
                          <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Output</th>
                          <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Operators</th>
                          <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Hours</th>
                          <th className="py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptPlans.map((plan: any) => {
                          const progressColor = plan.progress >= 80 ? 'text-emerald-500' : plan.progress >= 50 ? 'text-warning' : 'text-destructive';
                          return (
                            <tr key={plan.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              {viewMode !== 'daily' && <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{plan.date}</td>}
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className={`text-[10px] font-bold ${cfg.badgeClass}`}>
                                  {deptKey === 'cutting' ? 'T' : deptKey === 'finishing' ? 'F' : 'L'}{plan.lines?.line_number}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground text-xs">{plan.lines?.floors?.name || '—'}</td>
                              <td className="py-2.5 px-3 font-medium text-foreground">{plan.styles?.style_no || '—'}</td>
                              <td className="py-2.5 px-3 text-muted-foreground">{plan.styles?.buyer || '—'}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs">{plan.styles?.smv || '—'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-foreground">{plan.target_qty.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right font-medium text-foreground">{plan.output.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="text-foreground">{plan.planned_operators}</span>
                                {plan.planned_helpers > 0 && <span className="text-muted-foreground text-xs ml-1">+{plan.planned_helpers}h</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground">{plan.working_hours}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={plan.progress} className="h-1.5 flex-1" />
                                  <span className={`text-[10px] font-bold w-8 text-right ${progressColor}`}>{plan.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {deptPlans.length === 0 && (
                          <tr>
                            <td colSpan={viewMode !== 'daily' ? 11 : 10} className="py-12 text-center text-muted-foreground text-sm">
                              No {cfg.label.toLowerCase()} plans for {dateRange.label}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {deptPlans.length > 0 && (
                        <tfoot>
                          <tr className="bg-muted/40 border-t font-semibold text-xs">
                            <td className="py-2 px-3" colSpan={viewMode !== 'daily' ? 6 : 5}>Total ({deptPlans.length} plans)</td>
                            <td className="py-2 px-3 text-right font-bold">{summary.totalTarget.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-bold">{summary.totalOutput.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right">{summary.totalOps}</td>
                            <td className="py-2 px-3"></td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Progress value={summary.avgProgress} className="h-1.5 flex-1" />
                                <span className="text-[10px] font-bold w-8 text-right">{summary.avgProgress}%</span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
