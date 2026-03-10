import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CalendarDays, Target, TrendingUp, Users, Plus, Trash2, Copy, Upload, Download, Pencil, Check, X } from 'lucide-react';
import { format, startOfWeek, addDays, eachDayOfInterval, parseISO, addWeeks } from 'date-fns';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';

interface WeekPlanTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function WeekPlanTab({ factoryId, selectedDate, department }: WeekPlanTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingCell, setEditingCell] = useState<{ planId?: string; lineId: string; date: string } | null>(null);
  const [cellStyleId, setCellStyleId] = useState('');
  const [cellTarget, setCellTarget] = useState(0);
  const [cellOps, setCellOps] = useState(0);
  const [cellHelpers, setCellHelpers] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addLineId, setAddLineId] = useState('');

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 6 });
  const weekEnd = addDays(weekStart, 5);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: lines = [] } = useQuery({
    queryKey: ['week-plan-lines', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floor_id, operator_count, helper_count, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-week-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv, target_efficiency').order('style_no');
      return data ?? [];
    },
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

  const lineWeekData = useMemo(() => {
    const lineMap = new Map<string, { line: any; days: Map<string, { planId: string; target: number; output: number; style: string; styleId: string; buyer: string; ops: number; helpers: number }> }>();
    for (const l of lines as any[]) {
      lineMap.set(l.id, { line: l, days: new Map() });
    }
    for (const p of plans as any[]) {
      const entry = lineMap.get(p.line_id);
      if (!entry) continue;
      const output = outputByPlan.get(p.id) ?? 0;
      entry.days.set(p.date, {
        planId: p.id,
        target: p.target_qty,
        output,
        style: p.styles?.style_no || '',
        styleId: p.style_id,
        buyer: p.styles?.buyer || '',
        ops: p.planned_operators,
        helpers: p.planned_helpers,
      });
    }
    return Array.from(lineMap.values()).sort((a, b) => (a.line?.line_number || 0) - (b.line?.line_number || 0));
  }, [lines, plans, outputByPlan]);

  const totalTarget = (plans as any[]).reduce((s, p) => s + p.target_qty, 0);
  const totalOutput = Array.from(outputByPlan.values()).reduce((s, v) => s + v, 0);
  const plannedDays = new Set((plans as any[]).map(p => p.date)).size;

  const autoCalcTarget = (ops: number, smv: number, eff = 60, hours = 8) => {
    if (smv <= 0) return 0;
    return Math.floor((ops * hours * 60 * (eff / 100)) / smv);
  };

  const startInlineEdit = (lineId: string, dateStr: string, dayData?: any) => {
    if (dayData) {
      setEditingCell({ planId: dayData.planId, lineId, date: dateStr });
      setCellStyleId(dayData.styleId);
      setCellTarget(dayData.target);
      setCellOps(dayData.ops);
      setCellHelpers(dayData.helpers);
    } else {
      const line = lines.find((l: any) => l.id === lineId) as any;
      setEditingCell({ lineId, date: dateStr });
      setCellStyleId('');
      setCellTarget(0);
      setCellOps(line?.operator_count || 0);
      setCellHelpers(line?.helper_count || 0);
    }
  };

  const saveCellMutation = useMutation({
    mutationFn: async () => {
      if (!editingCell || !cellStyleId) throw new Error('Select a style');
      const payload = {
        date: editingCell.date,
        line_id: editingCell.lineId,
        style_id: cellStyleId,
        target_qty: cellTarget,
        planned_operators: cellOps,
        planned_helpers: cellHelpers,
        working_hours: 8,
        planned_efficiency: 60,
        target_efficiency: 65,
      };
      if (editingCell.planId) {
        const { error } = await supabase.from('production_plans').update(payload).eq('id', editingCell.planId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('production_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success('Plan saved');
      setEditingCell(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCellMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('production_plans').delete().eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success('Plan deleted');
      setEditingCell(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      if (!(plans as any[]).length) throw new Error('No plans this week to copy');
      const nextWeekStart = addWeeks(weekStart, 1);
      const newPlans = (plans as any[]).map(p => ({
        date: format(addDays(nextWeekStart, Math.round((parseISO(p.date).getTime() - weekStart.getTime()) / 86400000)), 'yyyy-MM-dd'),
        line_id: p.line_id,
        style_id: p.style_id,
        target_qty: p.target_qty,
        planned_operators: p.planned_operators,
        planned_helpers: p.planned_helpers,
        working_hours: Number(p.working_hours),
        planned_efficiency: Number(p.planned_efficiency),
        target_efficiency: Number(p.target_efficiency),
      }));
      const { error } = await supabase.from('production_plans').insert(newPlans);
      if (error) throw error;
      return newPlans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      toast.success(`Copied ${count} plans to next week`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWeekMutation = useMutation({
    mutationFn: async () => {
      if (!planIds.length) throw new Error('No plans to delete');
      const { error } = await supabase.from('production_plans').delete().in('id', planIds);
      if (error) throw error;
      return planIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Deleted ${count} plans for the week`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = () => {
    const rows = (plans as any[]).map(p => ({
      Date: p.date,
      Line: `L${p.lines?.line_number}`,
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
    exportToExcel(rows, `week_plan_${weekStartStr}`);
    toast.success('Exported week plan');
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
          line_id: line.id,
          style_id: style.id,
          target_qty: Number(r.Target) || 0,
          planned_operators: Number(r.Operators) || line.operator_count || 0,
          planned_helpers: Number(r.Helpers) || line.helper_count || 0,
          working_hours: Number(r['Working Hours']) || 8,
          planned_efficiency: Number(r['Planned Eff %']) || 60,
          target_efficiency: Number(r['Target Eff %']) || 65,
        };
      }).filter(Boolean);

      if (!newPlans.length) { toast.error('No valid rows found. Check Line (e.g. L1) and Style columns.'); return; }

      const { error } = await supabase.from('production_plans').insert(newPlans);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['week-plans'] });
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Imported ${newPlans.length} plans`);
    } catch (err: any) {
      toast.error(err.message);
    }
    e.target.value = '';
  };

  const handleCellStyleChange = (id: string) => {
    setCellStyleId(id);
    const style = styles.find(s => s.id === id);
    if (style && cellOps > 0) {
      setCellTarget(autoCalcTarget(cellOps, Number(style.smv)));
    }
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Week', value: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`, icon: CalendarDays, color: 'text-primary' },
          { label: 'Total Target', value: totalTarget.toLocaleString(), icon: Target, color: 'text-success' },
          { label: 'Total Output', value: totalOutput.toLocaleString(), icon: TrendingUp, color: 'text-accent' },
          { label: 'Days Planned', value: `${plannedDays} / 6`, icon: Users, color: 'text-primary' },
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Weekly Line × Day Plan
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            {planIds.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Week
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Week Plans?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete all {planIds.length} plan(s) for this week.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteWeekMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="outline" onClick={() => copyWeekMutation.mutate()} disabled={copyWeekMutation.isPending} className="gap-1.5 h-7">
              <Copy className="h-3.5 w-3.5" /> Copy to Next Week
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(['Date', 'Line', 'Style', 'Target', 'Operators', 'Helpers', 'Working Hours', 'Planned Eff %', 'Target Eff %'], 'week_plan')} className="gap-1.5 h-7">
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold sticky left-0 bg-background z-10">Line</th>
                  {weekDays.map(d => (
                    <th key={d.toISOString()} className="text-center py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold min-w-[130px]">
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
                        <span className="text-muted-foreground ml-1 text-[10px]">{line.floors?.name}</span>
                      </td>
                      {weekDays.map(d => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const dayData = days.get(dateStr);
                        const isEditing = editingCell?.lineId === line.id && editingCell?.date === dateStr;

                        if (isEditing) {
                          return (
                            <td key={dateStr} className="py-1 px-1">
                              <div className="space-y-1 bg-muted/50 rounded p-1.5 border border-primary/30">
                                <Select value={cellStyleId} onValueChange={handleCellStyleChange}>
                                  <SelectTrigger className="h-6 text-[10px]"><SelectValue placeholder="Style" /></SelectTrigger>
                                  <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.style_no}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="flex gap-1">
                                  <Input type="number" value={cellTarget} onChange={e => setCellTarget(Number(e.target.value))} className="h-6 text-[10px] w-16" placeholder="Target" />
                                  <Input type="number" value={cellOps} onChange={e => setCellOps(Number(e.target.value))} className="h-6 text-[10px] w-12" placeholder="Ops" />
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => saveCellMutation.mutate()}>
                                    <Check className="h-3 w-3 text-success" />
                                  </Button>
                                  {editingCell?.planId && (
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => deleteCellMutation.mutate(editingCell.planId!)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingCell(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        if (!dayData) {
                          return (
                            <td key={dateStr} className="py-2 px-1.5 text-center cursor-pointer hover:bg-primary/5 rounded transition-colors" onClick={() => startInlineEdit(line.id, dateStr)}>
                              <span className="text-muted-foreground/40 text-lg">+</span>
                            </td>
                          );
                        }

                        const pct = dayData.target > 0 ? Math.min(100, Math.round((dayData.output / dayData.target) * 100)) : 0;
                        return (
                          <td key={dateStr} className="py-1.5 px-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors" onClick={() => startInlineEdit(line.id, dateStr, dayData)}>
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
