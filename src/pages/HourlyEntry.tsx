import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, PenLine } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { useActiveFilter } from '@/hooks/useActiveFilter';
import { HourlyKPICards } from '@/components/hourly/HourlyKPICards';
import { HourlyTrackerTable } from '@/components/hourly/HourlyTrackerTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type DowntimeReason = Database['public']['Enums']['downtime_reason_type'];

const DOWNTIME_REASONS = [
  { value: 'machine_breakdown', label: 'Machine Breakdown' },
  { value: 'no_feeding', label: 'No Feeding' },
  { value: 'power_failure', label: 'Power Failure' },
  { value: 'style_changeover', label: 'Style Changeover' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'material_shortage', label: 'Material Shortage' },
  { value: 'absenteeism', label: 'Absenteeism' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
] as const;

const HOUR_LABELS = [
  '8–9 AM', '9–10 AM', '10–11 AM', '11–12 PM',
  '12–1 PM', '2–3 PM', '3–4 PM', '4–5 PM', '5–6 PM', '6–7 PM',
];

interface FormData {
  produced_qty: number;
  defects: number;
  rework: number;
  checked_qty: number;
  downtime_minutes: number;
  npt_minutes: number;
  operators_present: number;
  helpers_present: number;
  downtime_reason: string;
}

const emptyForm: FormData = {
  produced_qty: 0, defects: 0, rework: 0, checked_qty: 0,
  downtime_minutes: 0, npt_minutes: 0, operators_present: 0, helpers_present: 0, downtime_reason: '',
};

export default function HourlyEntry() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const activeFilter = useActiveFilter();

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState(1);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch today's plans with hourly records
  const { data: plans = [] } = useQuery({
    queryKey: ['production-plans-hourly', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, lines!production_plans_line_id_fkey(line_number, floor_id, type, floors(id, name)), styles!production_plans_style_id_fkey(style_no, smv, buyer)')
        .eq('date', today);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch ALL hourly records for today's plans
  const planIds = useMemo(() => plans.map((p: any) => p.id), [plans]);
  const { data: allHourlyRecords = [] } = useQuery({
    queryKey: ['hourly-production-all', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('*')
        .in('plan_id', planIds)
        .order('hour_slot');
      if (error) throw error;
      return data;
    },
    enabled: planIds.length > 0,
  });

  // Merge hourly records into plans
  const plansWithHourly = useMemo(() => {
    return plans.map((plan: any) => ({
      ...plan,
      hourly_records: allHourlyRecords.filter(r => r.plan_id === plan.id),
    }));
  }, [plans, allHourlyRecords]);

  // Filter plans based on sidebar
  const filteredPlans = useMemo(() => {
    if (!activeFilter || activeFilter === 'hr-all') return plansWithHourly;
    if (activeFilter.startsWith('hr-h')) return plansWithHourly;

    // Performance filters
    if (activeFilter === 'hr-below-target' || activeFilter === 'hr-on-target') {
      return plansWithHourly.filter((plan: any) => {
        const records = plan.hourly_records || [];
        if (records.length === 0) return activeFilter === 'hr-below-target'; // no data = below target
        const achieved = records.reduce((s: number, r: any) => s + r.produced_qty, 0);
        const filledHours = Math.max(...records.map((r: any) => r.hour_slot));
        const hourlyTarget = Math.round(plan.target_qty / (plan.working_hours || 8));
        const tgtUptoHr = hourlyTarget * filledHours;
        const pct = tgtUptoHr > 0 ? (achieved / tgtUptoHr) * 100 : 0;
        return activeFilter === 'hr-on-target' ? pct >= 100 : pct < 100;
      });
    }

    return plansWithHourly.filter((plan: any) => {
      const lineType = plan.lines?.type || 'sewing';
      const floorId = plan.lines?.floors?.id;

      if (activeFilter === 'hr-sewing') return lineType === 'sewing';
      if (activeFilter === 'hr-finishing') return lineType === 'finishing';
      if (activeFilter === 'hr-cutting') return lineType === 'cutting';
      if (activeFilter === 'hr-auxiliary') return lineType === 'auxiliary';
      if (activeFilter.startsWith('hr-floor-')) {
        return floorId === activeFilter.replace('hr-floor-', '');
      }
      return true;
    });
  }, [plansWithHourly, activeFilter]);

  // Separate by department
  const sewingPlans = useMemo(() =>
    filteredPlans.filter((p: any) => (p.lines?.type || 'sewing') === 'sewing')
      .sort((a: any, b: any) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0)),
    [filteredPlans]);

  const finishingPlans = useMemo(() =>
    filteredPlans.filter((p: any) => p.lines?.type === 'finishing')
      .sort((a: any, b: any) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0)),
    [filteredPlans]);

  const cuttingPlans = useMemo(() =>
    filteredPlans.filter((p: any) => p.lines?.type === 'cutting')
      .sort((a: any, b: any) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0)),
    [filteredPlans]);

  const auxiliaryPlans = useMemo(() =>
    filteredPlans.filter((p: any) => p.lines?.type === 'auxiliary')
      .sort((a: any, b: any) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0)),
    [filteredPlans]);

  // KPI calculations
  const kpis = useMemo(() => {
    const allRecords = filteredPlans.flatMap((p: any) => p.hourly_records || []);
    const totalOutput = allRecords.reduce((s: number, r: any) => s + r.produced_qty, 0);
    const totalTarget = filteredPlans.reduce((s: number, p: any) => s + (p.target_qty || 0), 0);
    const overallEfficiency = totalTarget > 0 ? (totalOutput / totalTarget) * 100 : 0;
    const pcsShort = Math.max(0, totalTarget - totalOutput);
    const linesBelowTarget = filteredPlans.filter((p: any) => {
      const output = (p.hourly_records || []).reduce((s: number, r: any) => s + r.produced_qty, 0);
      return p.target_qty > 0 && (output / p.target_qty) < 0.8;
    }).length;

    // Current hour based on time
    const now = new Date();
    const hour = now.getHours();
    let currentHour = Math.max(1, Math.min(9, hour - 7));
    if (hour >= 13) currentHour = Math.max(1, Math.min(9, hour - 8)); // lunch break offset

    return { totalOutput, totalTarget, overallEfficiency, pcsShort, linesBelowTarget, currentHour };
  }, [filteredPlans]);

  // Handle cell click to open entry dialog
  const handleCellClick = (planId: string, hourSlot: number) => {
    setEditingPlanId(planId);
    setEditingSlot(hourSlot);

    const plan = plansWithHourly.find((p: any) => p.id === planId);
    const existing = (plan?.hourly_records || []).find((r: any) => r.hour_slot === hourSlot);

    if (existing) {
      setForm({
        produced_qty: existing.produced_qty,
        defects: existing.defects,
        rework: existing.rework,
        checked_qty: existing.checked_qty,
        downtime_minutes: existing.downtime_minutes,
        npt_minutes: existing.npt_minutes,
        operators_present: existing.operators_present,
        helpers_present: existing.helpers_present,
        downtime_reason: existing.downtime_reason || '',
      });
    } else {
      setForm({
        ...emptyForm,
        operators_present: plan?.planned_operators ?? 0,
        helpers_present: plan?.planned_helpers ?? 0,
      });
    }
    setDialogOpen(true);
  };

  // Handle hour slot sidebar clicks
  useEffect(() => {
    if (activeFilter?.startsWith('hr-h')) {
      const hourNum = parseInt(activeFilter.replace('hr-h', ''));
      if (hourNum >= 1 && hourNum <= 9) setEditingSlot(hourNum);
    }
  }, [activeFilter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlanId) return;
      const plan = plansWithHourly.find((p: any) => p.id === editingPlanId);
      const existing = (plan?.hourly_records || []).find((r: any) => r.hour_slot === editingSlot);
      const payload = {
        plan_id: editingPlanId,
        hour_slot: editingSlot,
        produced_qty: form.produced_qty,
        defects: form.defects,
        rework: form.rework,
        checked_qty: form.checked_qty,
        downtime_minutes: form.downtime_minutes,
        npt_minutes: form.npt_minutes,
        operators_present: form.operators_present,
        helpers_present: form.helpers_present,
        downtime_reason: (form.downtime_reason || null) as DowntimeReason | null,
      };
      if (existing) {
        const { error } = await supabase.from('hourly_production').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hourly_production').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourly-production-all', planIds] });
      toast.success(`Hour ${editingSlot} saved`);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const handleSave = () => saveMutation.mutate();
  const handleSaveAndNext = () => {
    saveMutation.mutate();
    if (editingSlot < 9) setTimeout(() => setEditingSlot(prev => prev + 1), 300);
  };

  const updateField = (field: keyof FormData, value: number | string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Get label for editing plan
  const editingPlan = plansWithHourly.find((p: any) => p.id === editingPlanId);
  const editingLabel = editingPlan
    ? `${editingPlan.lines?.type === 'cutting' ? 'Table' : 'Line'} ${editingPlan.lines?.line_number} — ${editingPlan.styles?.style_no}`
    : '';
  const existingRecord = editingPlan?.hourly_records?.find((r: any) => r.hour_slot === editingSlot);

  // Load form when slot changes within dialog
  useEffect(() => {
    if (!dialogOpen || !editingPlanId) return;
    const plan = plansWithHourly.find((p: any) => p.id === editingPlanId);
    const existing = (plan?.hourly_records || []).find((r: any) => r.hour_slot === editingSlot);
    if (existing) {
      setForm({
        produced_qty: existing.produced_qty, defects: existing.defects, rework: existing.rework,
        checked_qty: existing.checked_qty, downtime_minutes: existing.downtime_minutes,
        npt_minutes: existing.npt_minutes, operators_present: existing.operators_present,
        helpers_present: existing.helpers_present, downtime_reason: existing.downtime_reason || '',
      });
    } else {
      setForm({ ...emptyForm, operators_present: plan?.planned_operators ?? 0, helpers_present: plan?.planned_helpers ?? 0 });
    }
  }, [editingSlot, dialogOpen, editingPlanId, plansWithHourly]);

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <Tabs defaultValue="tracker" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="tracker" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Hourly Tracker
              </TabsTrigger>
              <TabsTrigger value="entry" className="gap-1.5">
                <PenLine className="h-3.5 w-3.5" /> Hourly Entry
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tracker Tab */}
          <TabsContent value="tracker" className="space-y-4 mt-0">
            {/* KPI Cards */}
            <HourlyKPICards
              totalOutput={kpis.totalOutput}
              totalTarget={kpis.totalTarget}
              overallEfficiency={kpis.overallEfficiency}
              pcsShort={kpis.pcsShort}
              linesBelowTarget={kpis.linesBelowTarget}
              currentHour={kpis.currentHour}
              currentHourLabel={`Hour ${kpis.currentHour} of 9 (${HOUR_LABELS[kpis.currentHour - 1] || ''})`}
            />

            {/* Legend + Target */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-xs font-medium text-muted-foreground">Hourly Tracker — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/80" /> ≥100%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/70" /> 80–99%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink/70" /> &lt;80%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/50" /> Pending</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Target: Sewing {sewingPlans.length > 0 ? Math.round(sewingPlans[0].target_qty / (sewingPlans[0].working_hours || 8)) : 0} pcs/hr · Finishing {finishingPlans.length > 0 ? Math.round(finishingPlans[0].target_qty / (finishingPlans[0].working_hours || 8)) : 0} pcs/hr
              </div>
            </div>

      {/* Sewing Lines Table */}
            {sewingPlans.length > 0 && (
              <HourlyTrackerTable
                plans={sewingPlans}
                title="Sewing Lines — Hourly Output (pcs/line)"
                icon="🧵"
                defaultHourlyTarget={sewingPlans.length > 0 ? Math.round(sewingPlans[0].target_qty / (sewingPlans[0].working_hours || 8)) : 50}
                onCellClick={handleCellClick}
              />
            )}

            {finishingPlans.length > 0 && (
              <HourlyTrackerTable
                plans={finishingPlans}
                title="Finishing Lines — Hourly Output (pcs/line)"
                icon="✂️"
                defaultHourlyTarget={finishingPlans.length > 0 ? Math.round(finishingPlans[0].target_qty / (finishingPlans[0].working_hours || 8)) : 100}
                onCellClick={handleCellClick}
              />
            )}

            {cuttingPlans.length > 0 && (
              <HourlyTrackerTable
                plans={cuttingPlans}
                title="Cutting Tables — Hourly Output (pcs/table)"
                icon="🔪"
                defaultHourlyTarget={cuttingPlans.length > 0 ? Math.round(cuttingPlans[0].target_qty / (cuttingPlans[0].working_hours || 8)) : 75}
                onCellClick={handleCellClick}
              />
            )}

            {auxiliaryPlans.length > 0 && (
              <HourlyTrackerTable
                plans={auxiliaryPlans}
                title="Auxiliary Lines — Bartack & Eyelet (pcs/line)"
                icon="⚙️"
                defaultHourlyTarget={auxiliaryPlans.length > 0 ? Math.round(auxiliaryPlans[0].target_qty / (auxiliaryPlans[0].working_hours || 8)) : 100}
                onCellClick={handleCellClick}
              />
            )}

            {plans.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-3" />
                  <p className="text-muted-foreground">No production plans found for today.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a plan first from the Production Plans page.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Entry Tab - shows same tables but emphasizes data entry */}
          <TabsContent value="entry" className="space-y-4 mt-0">
            <HourlyKPICards
              totalOutput={kpis.totalOutput}
              totalTarget={kpis.totalTarget}
              overallEfficiency={kpis.overallEfficiency}
              pcsShort={kpis.pcsShort}
              linesBelowTarget={kpis.linesBelowTarget}
              currentHour={kpis.currentHour}
              currentHourLabel={`Hour ${kpis.currentHour} of 9 (${HOUR_LABELS[kpis.currentHour - 1] || ''})`}
            />

            <p className="text-xs text-muted-foreground">Click any cell in the tables above (Tracker tab) or select a line below to enter hourly data.</p>

            {sewingPlans.length > 0 && (
              <HourlyTrackerTable
                plans={sewingPlans}
                title="Sewing Lines — Hourly Output (pcs/line)"
                icon="🧵"
                defaultHourlyTarget={sewingPlans.length > 0 ? Math.round(sewingPlans[0].target_qty / (sewingPlans[0].working_hours || 8)) : 50}
                onCellClick={handleCellClick}
              />
            )}

            {finishingPlans.length > 0 && (
              <HourlyTrackerTable
                plans={finishingPlans}
                title="Finishing Lines — Hourly Output (pcs/line)"
                icon="✂️"
                defaultHourlyTarget={finishingPlans.length > 0 ? Math.round(finishingPlans[0].target_qty / (finishingPlans[0].working_hours || 8)) : 100}
                onCellClick={handleCellClick}
              />
            )}

            {plans.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-3" />
                  <p className="text-muted-foreground">No production plans found for today.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{editingLabel}</span>
              {existingRecord && (
                <Badge variant="outline" className="text-success border-success/30 text-[10px]">Saved</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Hour Slot Selector */}
          <div className="flex items-center gap-1 justify-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSlot(s => Math.max(1, s - 1))} disabled={editingSlot === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: 9 }, (_, i) => i + 1).map(slot => {
                const filled = editingPlan?.hourly_records?.some((r: any) => r.hour_slot === slot);
                return (
                  <button key={slot} onClick={() => setEditingSlot(slot)}
                    className={`h-8 w-8 rounded-md text-xs font-medium transition-colors relative
                      ${editingSlot === slot ? 'bg-primary text-primary-foreground shadow-sm'
                        : filled ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {slot}
                    {filled && editingSlot !== slot && <CheckCircle2 className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-success" />}
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSlot(s => Math.min(9, s + 1))} disabled={editingSlot === 9}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground -mt-2">Hour {editingSlot}: {HOUR_LABELS[editingSlot - 1]}</p>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Produced Qty</Label>
                <Input type="number" min={0} value={form.produced_qty || ''} onChange={e => updateField('produced_qty', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Checked Qty</Label>
                <Input type="number" min={0} value={form.checked_qty || ''} onChange={e => updateField('checked_qty', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Defects</Label>
                <Input type="number" min={0} value={form.defects || ''} onChange={e => updateField('defects', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Rework</Label>
                <Input type="number" min={0} value={form.rework || ''} onChange={e => updateField('rework', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Downtime (mins)</Label>
                <Input type="number" min={0} max={60} value={form.downtime_minutes || ''} onChange={e => updateField('downtime_minutes', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">NPT (mins)</Label>
                <Input type="number" min={0} max={60} value={form.npt_minutes || ''} onChange={e => updateField('npt_minutes', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
            </div>
            {form.downtime_minutes > 0 && (
              <div>
                <Label className="text-xs">Downtime Reason</Label>
                <Select value={form.downtime_reason} onValueChange={v => updateField('downtime_reason', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {DOWNTIME_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Operators</Label>
                <Input type="number" min={0} value={form.operators_present || ''} onChange={e => updateField('operators_present', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Helpers</Label>
                <Input type="number" min={0} value={form.helpers_present || ''} onChange={e => updateField('helpers_present', parseInt(e.target.value) || 0)} className="mt-1" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button variant="secondary" onClick={handleSaveAndNext} disabled={saveMutation.isPending || editingSlot === 9} className="flex-1">
                Save & Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
