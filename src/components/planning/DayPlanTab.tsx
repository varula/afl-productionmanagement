import { useState, useMemo } from 'react';
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
import { Plus, Trash2, Pencil, Target, Users, TrendingUp, Clock, UserMinus, Copy, Layers } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface DayPlanTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function DayPlanTab({ factoryId, selectedDate, department }: DayPlanTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [lineId, setLineId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [targetQty, setTargetQty] = useState(0);
  const [plannedOps, setPlannedOps] = useState(0);
  const [presentOps, setPresentOps] = useState(0);
  const [absentOps, setAbsentOps] = useState(0);
  const [plannedHelpers, setPlannedHelpers] = useState(0);
  const [workingHours, setWorkingHours] = useState(8);
  const [plannedEff, setPlannedEff] = useState(60);
  const [targetEff, setTargetEff] = useState(65);

  // Bulk add state
  const [bulkStyleId, setBulkStyleId] = useState('');
  const [bulkWorkingHours, setBulkWorkingHours] = useState(8);
  const [bulkPlannedEff, setBulkPlannedEff] = useState(60);
  const [bulkTargetEff, setBulkTargetEff] = useState(65);

  const { data: lines = [] } = useQuery({
    queryKey: ['lines-for-plans', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, type, floor_id, operator_count, helper_count, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv, sam, target_efficiency').order('style_no');
      return data ?? [];
    },
  });

  const lineIds = lines.map((l: any) => l.id);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['day-plans', selectedDate, department],
    queryFn: async () => {
      if (!lineIds.length) return [];
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, lines(line_number, type, floor_id, operator_count, floors(name)), styles(style_no, buyer, smv, sam)')
        .eq('date', selectedDate)
        .in('line_id', lineIds)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: lineIds.length > 0,
  });

  // Get hourly production for present operators
  const planIds = plans.map((p: any) => p.id);
  const { data: hourlyData = [] } = useQuery({
    queryKey: ['day-plan-hourly', planIds],
    queryFn: async () => {
      if (!planIds.length) return [];
      const { data } = await supabase.from('hourly_production').select('plan_id, produced_qty, operators_present, helpers_present').in('plan_id', planIds);
      return data ?? [];
    },
    enabled: planIds.length > 0,
  });

  const outputMap = useMemo(() => {
    const m = new Map<string, { output: number; maxOps: number }>();
    for (const h of hourlyData as any[]) {
      const e = m.get(h.plan_id) || { output: 0, maxOps: 0 };
      e.output += h.produced_qty;
      e.maxOps = Math.max(e.maxOps, h.operators_present || 0);
      m.set(h.plan_id, e);
    }
    return m;
  }, [hourlyData]);

  const enrichedPlans = useMemo(() =>
    (plans as any[]).map(p => {
      const stats = outputMap.get(p.id) || { output: 0, maxOps: 0 };
      const progress = p.target_qty > 0 ? Math.min(100, Math.round((stats.output / p.target_qty) * 100)) : 0;
      const lineOps = p.lines?.operator_count || p.planned_operators;
      const present = stats.maxOps || p.planned_operators;
      const absent = lineOps - present;
      const smv = Number(p.styles?.smv) || 0;
      const hours = Number(p.working_hours) || 0;
      const actualEff = (present > 0 && hours > 0 && smv > 0)
        ? (stats.output * smv) / (present * hours * 60) * 100
        : 0;
      return { ...p, output: stats.output, progress, presentOps: present, absentOps: Math.max(0, absent), actualEff: Math.round(actualEff * 10) / 10 };
    }), [plans, outputMap]);

  const totalTarget = enrichedPlans.reduce((s, p) => s + p.target_qty, 0);
  const totalOutput = enrichedPlans.reduce((s, p) => s + p.output, 0);
  const totalPlannedOps = enrichedPlans.reduce((s, p) => s + p.planned_operators, 0);
  const totalAbsent = enrichedPlans.reduce((s, p) => s + p.absentOps, 0);

  const autoCalcTarget = (ops: number, hours: number, eff: number, smv: number) => {
    if (smv <= 0) return 0;
    return Math.floor((ops * hours * 60 * (eff / 100)) / smv);
  };

  // Lines not yet planned for this date
  const unplannedLines = useMemo(() => {
    const plannedLineIds = new Set((plans as any[]).map(p => p.line_id));
    return (lines as any[]).filter(l => !plannedLineIds.has(l.id));
  }, [lines, plans]);

  const openCreate = () => {
    setEditingId(null);
    setLineId(''); setStyleId(''); setTargetQty(0); setPlannedOps(0); setPresentOps(0); setAbsentOps(0);
    setPlannedHelpers(0); setWorkingHours(8); setPlannedEff(60); setTargetEff(65);
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setLineId(plan.line_id); setStyleId(plan.style_id); setTargetQty(plan.target_qty);
    setPlannedOps(plan.planned_operators); setPresentOps(plan.presentOps); setAbsentOps(plan.absentOps);
    setPlannedHelpers(plan.planned_helpers); setWorkingHours(Number(plan.working_hours));
    setPlannedEff(Number(plan.planned_efficiency)); setTargetEff(Number(plan.target_efficiency));
    setDialogOpen(true);
  };

  const openBulkAdd = () => {
    setBulkStyleId('');
    setBulkWorkingHours(8);
    setBulkPlannedEff(60);
    setBulkTargetEff(65);
    setBulkDialogOpen(true);
  };

  const handleStyleChange = (id: string) => {
    setStyleId(id);
    const style = styles.find(s => s.id === id);
    if (style) {
      setTargetEff(Number(style.target_efficiency));
      if (plannedOps > 0) {
        setTargetQty(autoCalcTarget(plannedOps, workingHours, plannedEff, Number(style.smv)));
      }
    }
  };

  const handleOpsChange = (ops: number) => {
    setPlannedOps(ops);
    const style = styles.find(s => s.id === styleId);
    if (style && ops > 0) {
      setTargetQty(autoCalcTarget(ops, workingHours, plannedEff, Number(style.smv)));
    }
  };

  const handleLineChange = (id: string) => {
    setLineId(id);
    const line = lines.find((l: any) => l.id === id);
    if (line) {
      setPlannedOps((line as any).operator_count || 0);
      setPresentOps((line as any).operator_count || 0);
      setAbsentOps(0);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: selectedDate,
        line_id: lineId,
        style_id: styleId,
        target_qty: targetQty,
        planned_operators: plannedOps,
        planned_helpers: plannedHelpers,
        working_hours: workingHours,
        planned_efficiency: plannedEff,
        target_efficiency: targetEff,
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
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(editingId ? 'Plan updated' : 'Plan created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAddMutation = useMutation({
    mutationFn: async () => {
      if (!bulkStyleId) throw new Error('Select a style');
      if (unplannedLines.length === 0) throw new Error('All lines already have plans');

      const style = styles.find(s => s.id === bulkStyleId);
      const smv = Number(style?.smv) || 0;

      const newPlans = unplannedLines.map((line: any) => {
        const ops = line.operator_count || 0;
        const helpers = line.helper_count || 0;
        const target = autoCalcTarget(ops, bulkWorkingHours, bulkPlannedEff, smv);
        return {
          date: selectedDate,
          line_id: line.id,
          style_id: bulkStyleId,
          target_qty: target,
          planned_operators: ops,
          planned_helpers: helpers,
          working_hours: bulkWorkingHours,
          planned_efficiency: bulkPlannedEff,
          target_efficiency: bulkTargetEff,
        };
      });

      const { error } = await supabase.from('production_plans').insert(newPlans);
      if (error) throw error;
      return newPlans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Created plans for ${count} lines`);
      setBulkDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success('Plan deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const prevDate = format(subDays(new Date(selectedDate + 'T00:00'), 1), 'yyyy-MM-dd');
      const { data: prevPlans, error: fetchErr } = await supabase
        .from('production_plans')
        .select('line_id, style_id, target_qty, planned_operators, planned_helpers, working_hours, planned_efficiency, target_efficiency')
        .eq('date', prevDate)
        .in('line_id', lineIds);
      if (fetchErr) throw fetchErr;
      if (!prevPlans?.length) throw new Error(`No plans found for ${prevDate}`);

      // Filter out lines that already have plans for today
      const existingLineIds = new Set((plans as any[]).map(p => p.line_id));
      const newPlans = prevPlans
        .filter(p => !existingLineIds.has(p.line_id))
        .map(p => ({ ...p, date: selectedDate }));
      if (!newPlans.length) throw new Error('All lines from previous day already have plans for today');

      const { error: insertErr } = await supabase.from('production_plans').insert(newPlans);
      if (insertErr) throw insertErr;
      return newPlans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Copied ${count} plan(s) from previous day`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!planIds.length) throw new Error('No plans to delete');
      const { error } = await supabase.from('production_plans').delete().in('id', planIds);
      if (error) throw error;
      return planIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['day-plans'] });
      toast.success(`Deleted ${count} plan(s) for ${format(new Date(selectedDate + 'T00:00'), 'MMM d, yyyy')}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedStyle = styles.find(s => s.id === styleId);
  const bulkSelectedStyle = styles.find(s => s.id === bulkStyleId);

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Lines Planned', value: enrichedPlans.length, icon: Target, color: 'text-primary' },
          { label: 'Total Target', value: totalTarget.toLocaleString(), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Total Output', value: totalOutput.toLocaleString(), icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Total Manpower', value: totalPlannedOps, icon: Users, color: 'text-purple-500' },
          { label: 'Total Absent', value: totalAbsent, icon: UserMinus, color: 'text-destructive' },
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

      {/* Plans Table */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Day Plan — {format(new Date(selectedDate + 'T00:00'), 'EEE, MMM d, yyyy')}</CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            {enrichedPlans.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Plans?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {enrichedPlans.length} plan(s) for {format(new Date(selectedDate + 'T00:00'), 'EEEE, MMM d, yyyy')}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkDeleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="outline" onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending} className="gap-1.5 h-7">
              <Copy className="h-3.5 w-3.5" /> {copyMutation.isPending ? 'Copying...' : 'Copy Previous Day'}
            </Button>
            {unplannedLines.length > 0 && (
              <Button size="sm" variant="outline" onClick={openBulkAdd} className="gap-1.5 h-7">
                <Layers className="h-3.5 w-3.5" /> Add All Lines ({unplannedLines.length})
              </Button>
            )}
            <Button size="sm" onClick={openCreate} className="gap-1.5 h-7"><Plus className="h-3.5 w-3.5" /> Add Plan</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Line', 'Floor', 'Style', 'Buyer', 'SMV', 'SAM', 'Target', 'Output', 'Planned Ops', 'Present', 'Absent', 'Hours', 'Plan Eff %', 'Actual Eff %', 'Progress', ''].map(h => (
                    <th key={h} className={`py-2 px-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['SMV','SAM','Target','Output','Planned Ops','Present','Absent','Hours','Plan Eff %','Actual Eff %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrichedPlans.map((p: any) => {
                  const progressColor = p.progress >= 80 ? 'text-emerald-500' : p.progress >= 50 ? 'text-warning' : 'text-destructive';
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2.5"><Badge variant="outline" className="text-[10px] font-bold">L{p.lines?.line_number}</Badge></td>
                      <td className="py-2 px-2.5 text-xs text-muted-foreground">{p.lines?.floors?.name || '—'}</td>
                      <td className="py-2 px-2.5 font-medium text-foreground">{p.styles?.style_no || '—'}</td>
                      <td className="py-2 px-2.5 text-muted-foreground text-xs">{p.styles?.buyer || '—'}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-xs font-bold text-foreground">{p.styles?.smv || '—'}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-xs text-muted-foreground">{p.styles?.sam || '—'}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-foreground">{p.target_qty.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right font-medium">{p.output.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right">{p.planned_operators}</td>
                      <td className="py-2 px-2.5 text-right font-medium text-emerald-600">{p.presentOps}</td>
                      <td className="py-2 px-2.5 text-right">
                        {p.absentOps > 0 ? <span className="text-destructive font-bold">{p.absentOps}</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="py-2 px-2.5 text-right text-muted-foreground">{p.working_hours}</td>
                      <td className="py-2 px-2.5 text-right text-xs">{Number(p.planned_efficiency).toFixed(0)}%</td>
                      <td className="py-2 px-2.5 text-right text-xs font-bold">
                        <span className={p.actualEff >= Number(p.planned_efficiency) ? 'text-success' : p.actualEff > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                          {p.actualEff > 0 ? `${p.actualEff.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={p.progress} className="h-1.5 flex-1" />
                          <span className={`text-[10px] font-bold w-7 text-right ${progressColor}`}>{p.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {enrichedPlans.length === 0 && (
                  <tr><td colSpan={16} className="py-12 text-center text-muted-foreground text-sm">No plans for this date. Click "Add Plan" or "Add All Lines" to create.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'New'} Day Plan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Line *</Label>
              <Select value={lineId} onValueChange={handleLineChange}>
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
              <Select value={styleId} onValueChange={handleStyleChange}>
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
              <Input type="number" min={0} value={plannedOps || ''} onChange={e => handleOpsChange(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Present Operators</Label>
              <Input type="number" min={0} value={presentOps || ''} onChange={e => { setPresentOps(Number(e.target.value)); setAbsentOps(Math.max(0, plannedOps - Number(e.target.value))); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Absent Operators</Label>
              <Input type="number" min={0} value={absentOps} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planned Helpers</Label>
              <Input type="number" min={0} value={plannedHelpers || ''} onChange={e => setPlannedHelpers(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Working Hours</Label>
              <Input type="number" min={1} max={24} step={0.5} value={workingHours} onChange={e => setWorkingHours(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planned Efficiency %</Label>
              <Input type="number" min={0} max={100} value={plannedEff} onChange={e => setPlannedEff(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Efficiency %</Label>
              <Input type="number" min={0} max={100} value={targetEff} onChange={e => setTargetEff(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Qty (auto-calculated)</Label>
              <Input type="number" min={0} value={targetQty || ''} onChange={e => setTargetQty(Number(e.target.value))} />
            </div>
          </div>
          {selectedStyle && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
              <strong>{selectedStyle.style_no}</strong> | Buyer: {selectedStyle.buyer} | SMV: {selectedStyle.smv} | SAM: {selectedStyle.sam} | Target Eff: {selectedStyle.target_efficiency}%
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!lineId || !styleId || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Add All {unplannedLines.length} Lines
            </DialogTitle>
            <DialogDescription>
              Create plans for all {unplannedLines.length} unplanned {department} lines at once. Each line's operator/helper count from setup will be used, and target qty will be auto-calculated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Style (same for all lines) *</Label>
              <Select value={bulkStyleId} onValueChange={(id) => {
                setBulkStyleId(id);
                const style = styles.find(s => s.id === id);
                if (style) setBulkTargetEff(Number(style.target_efficiency));
              }}>
                <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer} (SMV: {s.smv})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Working Hours</Label>
                <Input type="number" min={1} max={24} step={0.5} value={bulkWorkingHours} onChange={e => setBulkWorkingHours(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Planned Eff %</Label>
                <Input type="number" min={0} max={100} value={bulkPlannedEff} onChange={e => setBulkPlannedEff(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Eff %</Label>
                <Input type="number" min={0} max={100} value={bulkTargetEff} onChange={e => setBulkTargetEff(Number(e.target.value))} />
              </div>
            </div>

            {bulkSelectedStyle && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                <strong>{bulkSelectedStyle.style_no}</strong> | Buyer: {bulkSelectedStyle.buyer} | SMV: {bulkSelectedStyle.smv}
              </div>
            )}

            {/* Preview of lines to be added */}
            <div className="border rounded-md overflow-hidden max-h-[200px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground">Line</th>
                    <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground">Floor</th>
                    <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground">Ops</th>
                    <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {unplannedLines.map((l: any) => {
                    const smv = Number(bulkSelectedStyle?.smv) || 0;
                    const target = autoCalcTarget(l.operator_count || 0, bulkWorkingHours, bulkPlannedEff, smv);
                    return (
                      <tr key={l.id} className="border-b border-border/30">
                        <td className="px-2.5 py-1.5 font-medium">L{l.line_number}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{l.floors?.name}</td>
                        <td className="px-2.5 py-1.5 text-right">{l.operator_count || 0}</td>
                        <td className="px-2.5 py-1.5 text-right font-bold">{target > 0 ? target.toLocaleString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkAddMutation.mutate()} disabled={!bulkStyleId || bulkAddMutation.isPending}>
              {bulkAddMutation.isPending ? 'Creating...' : `Create ${unplannedLines.length} Plans`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}