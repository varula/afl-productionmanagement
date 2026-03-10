import { useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CalendarDays, Target, TrendingUp, BarChart3, Trash2, Upload, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, parseISO } from 'date-fns';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';

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
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv').order('style_no');
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
        .in('line_id', lineIds);
      return data ?? [];
    },
    enabled: lineIds.length > 0,
  });

  const planIds = (plans as any[]).map(p => p.id);

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

  const styleSummary = useMemo(() => {
    const map = new Map<string, { style: string; buyer: string; totalTarget: number; daysPlanned: number; lineSet: Set<string> }>();
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || 'Unknown';
      const existing = map.get(key) || { style: key, buyer: p.styles?.buyer || '', totalTarget: 0, daysPlanned: 0, lineSet: new Set<string>() };
      existing.totalTarget += p.target_qty;
      existing.lineSet.add(p.line_id);
      map.set(key, existing);
    }
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || 'Unknown';
      const existing = map.get(key)!;
      existing.daysPlanned = new Set((plans as any[]).filter(pp => (pp.styles?.style_no || 'Unknown') === key).map(pp => pp.date)).size;
    }
    return Array.from(map.values()).sort((a, b) => b.totalTarget - a.totalTarget);
  }, [plans]);

  const totalMonthTarget = (plans as any[]).reduce((s, p) => s + p.target_qty, 0);
  const totalDaysPlanned = new Set((plans as any[]).map(p => p.date)).size;

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

  const handleExport = () => {
    const rows = (plans as any[]).map(p => ({
      Date: p.date,
      Line: `L${p.lines?.line_number}`,
      Floor: p.lines?.floors?.name || '',
      Style: p.styles?.style_no || '',
      Buyer: p.styles?.buyer || '',
      SMV: p.styles?.smv || '',
      Target: p.target_qty,
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

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Weekly Breakdown</CardTitle>
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
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(['Date', 'Line', 'Style', 'Target', 'Operators', 'Helpers', 'Working Hours', 'Planned Eff %', 'Target Eff %'], 'month_plan')} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 h-7">
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!planIds.length} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
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
