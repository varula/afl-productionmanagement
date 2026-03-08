import { useMemo, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Timer, TrendingUp, TrendingDown, Clock, Users, AlertTriangle, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, Legend, Area, AreaChart } from 'recharts';

// ── KPI Summary Card ──
function OTKPICard({ label, value, unit, icon: Icon, status }: {
  label: string; value: string; unit: string; icon: any; status: 'success' | 'warning' | 'danger';
}) {
  const colors = {
    success: 'text-success bg-success/8 border-success/20',
    warning: 'text-warning bg-warning/8 border-warning/20',
    danger: 'text-pink bg-pink/8 border-pink/20',
  };
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', colors[status])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OvertimePage() {
  const factoryId = useFactoryId();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const { totalOTMinutes, otBySection, otByFloor } = useDashboardData(dateStr, factoryId);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Fetch monthly OT trend data
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = format(endOfMonth(new Date(monthStart)), 'yyyy-MM-dd');
  
  const { data: monthlyPlans } = useQuery({
    queryKey: ['ot-monthly-plans', monthStart, monthEnd, factoryId],
    queryFn: async () => {
      let query = supabase
        .from('production_plans')
        .select('id, date, working_hours, planned_operators, lines!inner(type, floor_id, floors!inner(name))')
        .gte('date', monthStart)
        .lte('date', monthEnd);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const planIds = (monthlyPlans ?? []).map(p => p.id);
  const { data: monthlyHourly } = useQuery({
    queryKey: ['ot-monthly-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('plan_id, overtime_minutes, operators_present')
        .in('plan_id', planIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: planIds.length > 0,
    staleTime: 60_000,
  });

  // Aggregate monthly trend by date
  const monthlyTrendData = useMemo(() => {
    if (!monthlyPlans || !monthlyHourly) return [];
    const hourlyByPlan = new Map<string, number>();
    for (const h of monthlyHourly) {
      hourlyByPlan.set(h.plan_id, (hourlyByPlan.get(h.plan_id) ?? 0) + (h.overtime_minutes ?? 0));
    }
    const byDate = new Map<string, { ot: number; working: number }>();
    for (const plan of monthlyPlans) {
      const existing = byDate.get(plan.date) ?? { ot: 0, working: 0 };
      existing.ot += hourlyByPlan.get(plan.id) ?? 0;
      existing.working += (plan.working_hours ?? 8) * 60 * plan.planned_operators;
      byDate.set(plan.date, existing);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { ot, working }]) => ({
        date: format(new Date(date), 'dd MMM'),
        otHours: +(ot / 60).toFixed(1),
        otPct: working > 0 ? +((ot / working) * 100).toFixed(1) : 0,
      }));
  }, [monthlyPlans, monthlyHourly]);

  // Aggregate by section for monthly
  const monthlySectionData = useMemo(() => {
    if (!monthlyPlans || !monthlyHourly) return [];
    const hourlyByPlan = new Map<string, number>();
    for (const h of monthlyHourly) {
      hourlyByPlan.set(h.plan_id, (hourlyByPlan.get(h.plan_id) ?? 0) + (h.overtime_minutes ?? 0));
    }
    const bySection = new Map<string, number>();
    for (const plan of monthlyPlans) {
      const section = (plan.lines as any)?.type || 'sewing';
      const label = section.charAt(0).toUpperCase() + section.slice(1);
      bySection.set(label, (bySection.get(label) ?? 0) + (hourlyByPlan.get(plan.id) ?? 0));
    }
    return Array.from(bySection.entries()).map(([section, mins]) => ({
      section,
      hours: +(mins / 60).toFixed(1),
    }));
  }, [monthlyPlans, monthlyHourly]);

  // Today's OT summary
  const totalOTHours = (totalOTMinutes / 60).toFixed(1);
  const avgOTPct = otBySection.length > 0
    ? (otBySection.reduce((s, o) => s + o.otPct, 0) / otBySection.length).toFixed(1)
    : '0.0';
  const monthTotalOT = monthlyTrendData.reduce((s, d) => s + d.otHours, 0).toFixed(1);

  const trendChartConfig = {
    otHours: { label: 'OT Hours', color: 'hsl(var(--warning))' },
    otPct: { label: 'OT %', color: 'hsl(var(--pink))' },
  };
  const sectionChartConfig = {
    hours: { label: 'OT Hours', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Overtime Management</h1>
        <p className="text-xs text-muted-foreground">Track, analyze, and manage overtime across departments and floors</p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="approval">Approval Workflow</TabsTrigger>
        </TabsList>

        {/* ═══ ANALYTICS TAB ═══ */}
        <TabsContent value="analytics" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <OTKPICard label="Today's OT" value={totalOTHours} unit="hrs" icon={Timer} status={Number(totalOTHours) > 10 ? 'danger' : Number(totalOTHours) > 5 ? 'warning' : 'success'} />
            <OTKPICard label="Avg OT %" value={avgOTPct} unit="%" icon={TrendingUp} status={Number(avgOTPct) > 10 ? 'danger' : Number(avgOTPct) > 5 ? 'warning' : 'success'} />
            <OTKPICard label="Month Total" value={monthTotalOT} unit="hrs" icon={Clock} status={Number(monthTotalOT) > 200 ? 'danger' : Number(monthTotalOT) > 100 ? 'warning' : 'success'} />
            <OTKPICard label="Sections Active" value={String(otBySection.filter(s => s.otMinutes > 0).length)} unit="depts" icon={Users} status="success" />
          </div>

          {/* Today's Breakdown: Section & Floor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* By Section */}
            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Today — By Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(otBySection.length > 0 ? otBySection : [
                    { section: 'Sewing', otMinutes: 0, otPct: 0 },
                    { section: 'Cutting', otMinutes: 0, otPct: 0 },
                    { section: 'Finishing', otMinutes: 0, otPct: 0 },
                  ]).map(s => {
                    const hrs = (s.otMinutes / 60).toFixed(1);
                    const pct = s.otPct.toFixed(1);
                    const barW = Math.min(s.otPct * 5, 100);
                    return (
                      <div key={s.section} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{s.section}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold tabular-nums text-foreground">{hrs} hrs</span>
                            <span className={cn('text-xs font-bold tabular-nums', Number(pct) > 10 ? 'text-pink' : Number(pct) > 5 ? 'text-warning' : 'text-success')}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', Number(pct) > 10 ? 'bg-pink' : Number(pct) > 5 ? 'bg-warning' : 'bg-success')} style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Floor */}
            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Today — By Floor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(otByFloor.length > 0 ? otByFloor : [
                    { section: 'Floor 1', otMinutes: 0, otPct: 0 },
                    { section: 'Floor 2', otMinutes: 0, otPct: 0 },
                  ]).map(f => {
                    const hrs = (f.otMinutes / 60).toFixed(1);
                    const pct = f.otPct.toFixed(1);
                    const barW = Math.min(f.otPct * 5, 100);
                    return (
                      <div key={f.section} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{f.section}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold tabular-nums text-foreground">{hrs} hrs</span>
                            <span className={cn('text-xs font-bold tabular-nums', Number(pct) > 10 ? 'text-pink' : Number(pct) > 5 ? 'text-warning' : 'text-success')}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', Number(pct) > 10 ? 'bg-pink' : Number(pct) > 5 ? 'bg-warning' : 'bg-success')} style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card className="border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Monthly OT Trend</CardTitle>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-40 h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <ChartContainer config={trendChartConfig} className="h-[260px] w-full">
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area yAxisId="left" type="monotone" dataKey="otHours" fill="hsl(var(--warning)/0.15)" stroke="hsl(var(--warning))" strokeWidth={2} name="OT Hours" />
                    <Line yAxisId="right" type="monotone" dataKey="otPct" stroke="hsl(var(--pink))" strokeWidth={2} dot={false} name="OT %" />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No OT data for this month</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Comparison Bar Chart */}
          {monthlySectionData.length > 0 && (
            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Monthly OT by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sectionChartConfig} className="h-[200px] w-full">
                  <BarChart data={monthlySectionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="section" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="OT Hours" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ APPROVAL TAB ═══ */}
        <TabsContent value="approval" className="space-y-4">
          <Card className="border border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">OT Approval Requests</CardTitle>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Submit and track overtime approval requests for each department/floor</p>
            </CardHeader>
            <CardContent>
              {/* Mock approval table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Floor</TableHead>
                    <TableHead className="text-xs">Requested Hours</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { date: format(new Date(), 'dd MMM'), dept: 'Sewing', floor: 'Floor 1', hours: '2.0', reason: 'Urgent order completion', status: 'pending' },
                    { date: format(new Date(), 'dd MMM'), dept: 'Cutting', floor: 'Floor 2', hours: '1.5', reason: 'Material delay recovery', status: 'pending' },
                    { date: format(subDays(new Date(), 1), 'dd MMM'), dept: 'Finishing', floor: 'Floor 1', hours: '2.0', reason: 'Shipment deadline', status: 'approved' },
                    { date: format(subDays(new Date(), 2), 'dd MMM'), dept: 'Sewing', floor: 'Floor 3', hours: '3.0', reason: 'Style changeover delay', status: 'rejected' },
                  ].map((row, idx) => (
                    <TableRow key={idx} className={cn(idx % 2 === 1 && 'bg-muted/15')}>
                      <TableCell className="text-xs font-medium">{row.date}</TableCell>
                      <TableCell className="text-xs">{row.dept}</TableCell>
                      <TableCell className="text-xs">{row.floor}</TableCell>
                      <TableCell className="text-xs font-bold tabular-nums">{row.hours} hrs</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[9px] font-bold',
                          row.status === 'approved' && 'border-success/30 text-success bg-success/8',
                          row.status === 'rejected' && 'border-pink/30 text-pink bg-pink/8',
                          row.status === 'pending' && 'border-warning/30 text-warning bg-warning/8',
                        )}>
                          {row.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {row.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {row.status === 'pending' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-success hover:bg-success/10">Approve</Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-pink hover:bg-pink/10">Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
