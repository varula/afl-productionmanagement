import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CalendarDays, Target, TrendingUp, BarChart3, Trash2, Upload, Download, Plus, Pencil, Layers, Copy } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, parseISO, addMonths } from 'date-fns';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';
import { MonthCalendarHeatmap } from './MonthCalendarHeatmap';

interface MonthPlanTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function MonthPlanTab({ factoryId, selectedDate, department }: MonthPlanTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const monthStart = startOfMonth(parseISO(selectedDate));
  const monthEnd = endOfMonth(parseISO(selectedDate));
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  // CRUD state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formLineId, setFormLineId] = useState('');
  const [formStyleId, setFormStyleId] = useState('');
  const [formTarget, setFormTarget] = useState(0);
  const [formOps, setFormOps] = useState(0);
  const [formHelpers, setFormHelpers] = useState(0);
  const [formHours, setFormHours] = useState(8);
  const [formPlannedEff, setFormPlannedEff] = useState(60);
  const [formTargetEff, setFormTargetEff] = useState(65);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  const weeks = useMemo(() => {
    const starts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 6 });
    return starts.map(ws => {
      const wEnd = addDays(ws, 5);
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
      const { data } = await supabase.from('lines').select('id, line_number, operator_count, helper_count, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-month-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv, target_efficiency').order('style_no');
      return data ?? [];
    },
  });

  const lineIds = lines.map((l: any) => l.id);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['month-plans', monthStartStr, monthEndStr, department],
    queryFn: async () => {
      if (!lineIds.length) return [];
      const { data } = await supabase
        .from('production_plans')
        .select('*, lines(line_number, floors(name)), styles(style_no, buyer, smv)')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .in('line_id', lineIds)
        .order('date');
      return data ?? [];
    },
    enabled: lineIds.length > 0,
  });

  const planIds = (plans as any[]).map(p => p.id);

  // Hourly data for actual output
  const { data: hourly = [] } = useQuery({
    queryKey: ['month-plan-hourly', planIds],
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

  const weekSummaries = useMemo(() => {
    return weeks.map((w, i) => {
      const wStart = format(w.start, 'yyyy-MM-dd');
      const wEnd = format(w.end, 'yyyy-MM-dd');
      const weekPlans = (plans as any[]).filter(p => p.date >= wStart && p.date <= wEnd);
      const totalTarget = weekPlans.reduce((s, p) => s + p.target_qty, 0);
      const totalOutput = weekPlans.reduce((s, p) => s + (outputByPlan.get(p.id) ?? 0), 0);
      const linesPlanned = new Set(weekPlans.map(p => p.line_id)).size;
      const daysPlanned = new Set(weekPlans.map(p => p.date)).size;
      const styleSet = new Set(weekPlans.map(p => p.styles?.style_no).filter(Boolean));
      return { weekNum: i + 1, start: w.start, end: w.end, totalTarget, totalOutput, linesPlanned, daysPlanned, styles: Array.from(styleSet) };
    });
  }, [weeks, plans, outputByPlan]);

  const styleSummary = useMemo(() => {
    const map = new Map<string, { style: string; buyer: string; totalTarget: number; totalOutput: number; daysPlanned: number; lineSet: Set<string> }>();
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || 'Unknown';
      const existing = map.get(key) || { style: key, buyer: p.styles?.buyer || '', totalTarget: 0, totalOutput: 0, daysPlanned: 0, lineSet: new Set<string>() };
      existing.totalTarget += p.target_qty;
      existing.totalOutput += (outputByPlan.get(p.id) ?? 0);
      existing.lineSet.add(p.line_id);
      map.set(key, existing);
    }
    for (const [key, existing] of map.entries()) {
      existing.daysPlanned = new Set((plans as any[]).filter(pp => (pp.styles?.style_no || 'Unknown') === key).map(pp => pp.date)).size;
    }
    return Array.from(map.values()).sort((a, b) => b.totalTarget - a.totalTarget);
  }, [plans, outputByPlan]);

  const totalMonthTarget = (plans as any[]).reduce((s, p) => s + p.target_qty, 0);
  const totalMonthOutput = Array.from(outputByPlan.values()).reduce((s, v) => s + v, 0);
  const totalDaysPlanned = new Set((plans as any[]).map(p => p.date)).size;
  const monthProgress = totalMonthTarget > 0 ? Math.round((totalMonthOutput / totalMonthTarget) * 100) : 0;

  const autoCalcTarget = (ops: number, smv: number, eff = 60, hours = 8) => {
    if (smv <= 0) return 0;
    return Math.floor((ops * hours * 60 * (eff / 100)) / smv);
  };

  // CRUD handlers
  const openCreate = (dateStr?: string) => {
    setEditingId(null);
    setFormDate(dateStr || format(monthStart, 'yyyy-MM-dd'));
    setFormLineId('');
    setFormStyleId('');
    setFormTarget(0);
    setFormOps(0);
    setFormHelpers(0);
    setFormHours(8);
    setFormPlannedEff(60);
    setFormTargetEff(65);
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setFormDate(plan.date);
    setFormLineId(plan.line_id);
    setFormStyleId(plan.style_id);
    setFormTarget(plan.target_qty);
    setFormOps(plan.planned_operators);
    setFormHelpers(plan.planned_helpers);
    setFormHours(Number(plan.working_hours));
    setFormPlannedEff(Number(plan.planned_efficiency));
    setFormTargetEff(Number(plan.target_efficiency));
    setDialogOpen(true);
  };

  const handleLineChange = (id: string) => {
    setFormLineId(id);
    const line = lines.find((l: any) => l.id === id) as any;
    if (line) {
      setFormOps(line.operator_count || 0);
      setFormHelpers(line.helper_count || 0);
      const style = styles.find(s => s.id === formStyleId);
      if (style && line.operator_count > 0) {
        setFormTarget(autoCalcTarget(line.operator_count, Number(style.smv), formPlannedEff, formHours));
      }
    }
  };

  const handleStyleChange = (id: string) => {
    setFormStyleId(id);
    const style = styles.find(s => s.id === id);
    if (style) {
      setFormTargetEff(Number(style.target_efficiency));
      if (formOps > 0) {
        setFormTarget(autoCalcTarget(formOps, Number(style.smv), formPlannedEff, formHours));
      }
    }
  };

  const handleOpsChange = (ops: number) => {
    setFormOps(ops);
    const style = styles.find(s => s.id === formStyleId);
    if (style && ops > 0) {
      setFormTarget(autoCalcTarget(ops, Number(style.smv), formPlannedEff, formHours));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formLineId || !formStyleId) throw new Error('Select line and style');
      const payload = {
        date: formDate,
        line_id: formLineId,
        style_id: formStyleId,
        target_qty: formTarget,
        planned_operators: formOps,
        planned_helpers: formHelpers,
        working_hours: formHours,
        planned_efficiency: formPlannedEff,
        target_efficiency: formTargetEff,
      };
      if (editingId) {
        const { error } = await supabase.from('production_plans').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('production_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['month-plans'] });
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(editingId ? 'Plan updated' : 'Plan created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['month-plans'] });
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success('Plan deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMonthMutation = useMutation({
    mutationFn: async () => {
      if (!planIds.length) throw new Error('No plans to delete');
      const { error } = await supabase.from('production_plans').delete().in('id', planIds);
      if (error) throw error;
      return planIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['month-plans'] });
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Deleted ${count} plans for the month`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyToNextMonthMutation = useMutation({
    mutationFn: async () => {
      if (!(plans as any[]).length) throw new Error('No plans this month to copy');
      const nextMonthStart = addMonths(monthStart, 1);
      const newPlans = (plans as any[]).map(p => {
        const dayOfMonth = parseISO(p.date).getDate();
        const nextEndOfMonth = endOfMonth(nextMonthStart);
        const targetDay = Math.min(dayOfMonth, nextEndOfMonth.getDate());
        const nextDate = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), targetDay);
        return {
          date: format(nextDate, 'yyyy-MM-dd'),
          line_id: p.line_id,
          style_id: p.style_id,
          target_qty: p.target_qty,
          planned_operators: p.planned_operators,
          planned_helpers: p.planned_helpers,
          working_hours: Number(p.working_hours),
          planned_efficiency: Number(p.planned_efficiency),
          target_efficiency: Number(p.target_efficiency),
        };
      });
      const { error } = await supabase.from('production_plans').insert(newPlans);
      if (error) throw error;
      return newPlans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['month-plans'] });
      toast.success(`Copied ${count} plans to ${format(addMonths(monthStart, 1), 'MMMM yyyy')}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = () => {
    const rows = (plans as any[]).map(p => ({
      Date: p.date,
      Line: `L${p.lines?.line_number}`,
      Floor: p.lines?.floors?.name || '',
      Style: p.styles?.style_no || '',
      Buyer: p.styles?.buyer || '',
      SMV: p.styles?.smv || '',
      Target: p.target_qty,
      Output: outputByPlan.get(p.id) ?? 0,
      Operators: p.planned_operators,
      Helpers: p.planned_helpers,
      'Working Hours': Number(p.working_hours),
      'Planned Eff %': Number(p.planned_efficiency),
      'Target Eff %': Number(p.target_efficiency),
    }));
    exportToExcel(rows, `month_plan_${format(monthStart, 'yyyy-MM')}`, 'Month Plan');
    toast.success('Exported month plan');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) { toast.error('Empty file'); return; }
      const lineMap = new Map((lines as any[]).map(l => [`L${l.line_number}`, l]));
      const styleMap = new Map(styles.map(s => [s.style_no, s]));
      const newPlans = rows.map((r: any) => {
        const line = lineMap.get(r.Line);
        const style = styleMap.get(r.Style);
        if (!line || !style) return null;
        return {
          date: r.Date,
          line_id: (line as any).id,
          style_id: style.id,
          target_qty: Number(r.Target) || 0,
          planned_operators: Number(r.Operators) || (line as any).operator_count || 0,
          planned_helpers: Number(r.Helpers) || (line as any).helper_count || 0,
          working_hours: Number(r['Working Hours']) || 8,
          planned_efficiency: Number(r['Planned Eff %']) || 60,
          target_efficiency: Number(r['Target Eff %']) || 65,
        };
      }).filter(Boolean);
      if (!newPlans.length) { toast.error('No valid rows. Check Line (e.g. L1) and Style columns.'); return; }
      const { error } = await supabase.from('production_plans').insert(newPlans);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['month-plans'] });
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Imported ${newPlans.length} plans`);
    } catch (err: any) {
      toast.error(err.message);
    }
    e.target.value = '';
  };

  // Calendar heatmap data
  const calendarPlans = useMemo(() => {
    return (plans as any[]).map(p => ({
      date: p.date,
      line_id: p.line_id,
      target_qty: p.target_qty,
      style: p.styles?.style_no || '',
      lineNo: `L${p.lines?.line_number}`,
    }));
  }, [plans]);

  const selectedStyle = styles.find(s => s.id === formStyleId);

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      {/* KPI Cards with progress */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Month', value: format(monthStart, 'MMMM yyyy'), icon: CalendarDays, color: 'text-primary' },
          { label: 'Monthly Target', value: totalMonthTarget.toLocaleString(), icon: Target, color: 'text-success' },
          { label: 'Monthly Output', value: totalMonthOutput.toLocaleString(), icon: TrendingUp, color: 'text-accent' },
          { label: 'Days Planned', value: String(totalDaysPlanned), icon: CalendarDays, color: 'text-primary' },
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

      {/* Month progress bar */}
      {totalMonthTarget > 0 && (
        <Card className="border-[1.5px]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Month Progress</span>
              <span className="text-xs font-bold text-foreground">{totalMonthOutput.toLocaleString()} / {totalMonthTarget.toLocaleString()} ({monthProgress}%)</span>
            </div>
            <Progress value={monthProgress} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      {/* Calendar Heatmap + Actions */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> {format(monthStart, 'MMMM yyyy')} — Plan Overview
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            {planIds.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Month
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Month Plans?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete all {planIds.length} plan(s) for {format(monthStart, 'MMMM yyyy')}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMonthMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="outline" onClick={() => copyToNextMonthMutation.mutate()} disabled={copyToNextMonthMutation.isPending || !planIds.length} className="gap-1.5 h-7">
              <Copy className="h-3.5 w-3.5" /> Copy to Next Month
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(['Date', 'Line', 'Style', 'Target', 'Operators', 'Helpers', 'Working Hours', 'Planned Eff %', 'Target Eff %'], 'month_plan')} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 h-7">
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!planIds.length} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" onClick={() => openCreate()} className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" /> Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <MonthCalendarHeatmap
            monthStart={monthStart}
            plans={calendarPlans}
            onDayClick={(dateStr) => openCreate(dateStr)}
          />
        </CardContent>
      </Card>

      {/* Weekly breakdown with output */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Week', 'Period', 'Lines', 'Days', 'Styles', 'Target', 'Output', 'Achievement'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Lines', 'Days', 'Target', 'Output'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : weekSummaries.map(w => {
                  const pct = w.totalTarget > 0 ? Math.round((w.totalOutput / w.totalTarget) * 100) : 0;
                  return (
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
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">{w.totalOutput.toLocaleString()}</td>
                      <td className="py-2.5 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className={`text-[10px] font-bold w-8 text-right ${pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed plan list with edit/delete */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold">All Plans — {format(monthStart, 'MMMM yyyy')} ({planIds.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Date', 'Line', 'Floor', 'Style', 'Buyer', 'SMV', 'Target', 'Output', 'Ops', 'Helpers', 'Hours', 'Eff %', 'Progress', ''].map(h => (
                    <th key={h} className={`py-2 px-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold ${['SMV', 'Target', 'Output', 'Ops', 'Helpers', 'Hours', 'Eff %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : (plans as any[]).length === 0 ? (
                  <tr><td colSpan={14} className="py-12 text-center text-muted-foreground text-sm">No plans for this month. Click <strong>"Add Plan"</strong> or click a day on the calendar.</td></tr>
                ) : (plans as any[]).map(p => {
                  const output = outputByPlan.get(p.id) ?? 0;
                  const pct = p.target_qty > 0 ? Math.min(100, Math.round((output / p.target_qty) * 100)) : 0;
                  const pctColor = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : output > 0 ? 'text-destructive' : 'text-muted-foreground';
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-mono text-muted-foreground text-[10px]">{format(parseISO(p.date), 'EEE, MMM d')}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[9px] font-bold">L{p.lines?.line_number}</Badge></td>
                      <td className="py-2 px-2 text-muted-foreground text-[10px]">{p.lines?.floors?.name || ''}</td>
                      <td className="py-2 px-2 font-medium text-foreground">{p.styles?.style_no || ''}</td>
                      <td className="py-2 px-2 text-muted-foreground text-[10px]">{p.styles?.buyer || ''}</td>
                      <td className="py-2 px-2 text-right font-mono text-[10px]">{p.styles?.smv || ''}</td>
                      <td className="py-2 px-2 text-right font-bold text-foreground">{p.target_qty.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-medium">{output > 0 ? output.toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-right">{p.planned_operators}</td>
                      <td className="py-2 px-2 text-right">{p.planned_helpers}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{Number(p.working_hours)}</td>
                      <td className="py-2 px-2 text-right text-[10px]">{Number(p.planned_efficiency).toFixed(0)}%</td>
                      <td className="py-2 px-2 w-24">
                        <div className="flex items-center gap-1">
                          <Progress value={pct} className="h-1 flex-1" />
                          <span className={`text-[9px] font-bold w-7 text-right ${pctColor}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deletePlanMutation.mutate(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  {['Style', 'Buyer', 'Lines', 'Days Planned', 'Monthly Target', 'Output', 'Achievement'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Lines', 'Days Planned', 'Monthly Target', 'Output'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {styleSummary.map(s => {
                  const pct = s.totalTarget > 0 ? Math.round((s.totalOutput / s.totalTarget) * 100) : 0;
                  return (
                    <tr key={s.style} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium text-foreground">{s.style}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{s.buyer}</td>
                      <td className="py-2.5 px-3 text-right">{s.lineSet.size}</td>
                      <td className="py-2.5 px-3 text-right">{s.daysPlanned}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{s.totalTarget.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{s.totalOutput.toLocaleString()}</td>
                      <td className="py-2.5 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className={`text-[10px] font-bold w-8 text-right ${pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {styleSummary.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">No plans for this month</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'New'} Month Plan Entry</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update plan details below.' : 'Create a new production plan for this month.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} min={monthStartStr} max={monthEndStr} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line *</Label>
              <Select value={formLineId} onValueChange={handleLineChange}>
                <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>
                  {(lines as any[]).map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>L{l.line_number} — {l.floors?.name} ({l.operator_count} ops)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style *</Label>
              <Select value={formStyleId} onValueChange={handleStyleChange}>
                <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer} (SMV: {s.smv})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planned Operators</Label>
              <Input type="number" min={0} value={formOps || ''} onChange={e => handleOpsChange(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planned Helpers</Label>
              <Input type="number" min={0} value={formHelpers || ''} onChange={e => setFormHelpers(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Working Hours</Label>
              <Input type="number" min={1} max={24} step={0.5} value={formHours} onChange={e => setFormHours(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planned Efficiency %</Label>
              <Input type="number" min={0} max={100} value={formPlannedEff} onChange={e => setFormPlannedEff(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Efficiency %</Label>
              <Input type="number" min={0} max={100} value={formTargetEff} onChange={e => setFormTargetEff(Number(e.target.value))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Target Qty (auto-calculated)</Label>
              <Input type="number" min={0} value={formTarget || ''} onChange={e => setFormTarget(Number(e.target.value))} />
            </div>
          </div>
          {selectedStyle && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
              <strong>{selectedStyle.style_no}</strong> | Buyer: {selectedStyle.buyer} | SMV: {selectedStyle.smv} | Target Eff: {selectedStyle.target_efficiency}%
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formLineId || !formStyleId || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
