import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, Save, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { Tables, Database } from '@/integrations/supabase/types';

type DowntimeReason = Database['public']['Enums']['downtime_reason_type'];

const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

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

type HourlyRecord = Tables<'hourly_production'>;

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
  produced_qty: 0,
  defects: 0,
  rework: 0,
  checked_qty: 0,
  downtime_minutes: 0,
  npt_minutes: 0,
  operators_present: 0,
  helpers_present: 0,
  downtime_reason: '',
};

export default function HourlyEntry() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activeSlot, setActiveSlot] = useState(1);
  const [form, setForm] = useState<FormData>({ ...emptyForm });

  // Fetch today's production plans with line + style info
  const { data: plans = [] } = useQuery({
    queryKey: ['production-plans', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, lines!production_plans_line_id_fkey(line_number, floor_id), styles!production_plans_style_id_fkey(style_no, smv)')
        .eq('date', today);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch hourly records for the selected plan
  const { data: hourlyRecords = [] } = useQuery({
    queryKey: ['hourly-production', selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('*')
        .eq('plan_id', selectedPlanId)
        .order('hour_slot');
      if (error) throw error;
      return data as HourlyRecord[];
    },
    enabled: !!selectedPlanId,
  });

  // Auto-select first plan
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Load existing record into form when slot changes
  useEffect(() => {
    const existing = hourlyRecords.find(r => r.hour_slot === activeSlot);
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
      // Pre-fill operators from plan
      const plan = plans.find(p => p.id === selectedPlanId);
      setForm({
        ...emptyForm,
        operators_present: plan?.planned_operators ?? 0,
        helpers_present: plan?.planned_helpers ?? 0,
      });
    }
  }, [activeSlot, hourlyRecords, selectedPlanId, plans]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = hourlyRecords.find(r => r.hour_slot === activeSlot);
      const payload = {
        plan_id: selectedPlanId,
        hour_slot: activeSlot,
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
        const { error } = await supabase
          .from('hourly_production')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hourly_production')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourly-production', selectedPlanId] });
      toast.success(`Hour ${activeSlot} saved successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save');
    },
  });

  // Running totals
  const totals = useMemo(() => {
    return hourlyRecords.reduce(
      (acc, r) => ({
        produced: acc.produced + r.produced_qty,
        defects: acc.defects + r.defects,
        rework: acc.rework + r.rework,
        checked: acc.checked + r.checked_qty,
        downtime: acc.downtime + r.downtime_minutes,
        npt: acc.npt + r.npt_minutes,
      }),
      { produced: 0, defects: 0, rework: 0, checked: 0, downtime: 0, npt: 0 }
    );
  }, [hourlyRecords]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const achievement = selectedPlan?.target_qty
    ? Math.round((totals.produced / selectedPlan.target_qty) * 100)
    : 0;
  const dhu = totals.checked > 0 ? ((totals.defects / totals.checked) * 100).toFixed(1) : '0.0';
  const filledSlots = new Set(hourlyRecords.map(r => r.hour_slot));

  const updateField = (field: keyof FormData, value: number | string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndNext = () => {
    saveMutation.mutate();
    if (activeSlot < 10) {
      setTimeout(() => setActiveSlot(prev => prev + 1), 300);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Hourly Production Entry</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Plan Selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Select Line / Plan</Label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a production plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  Line {plan.lines?.line_number} — {plan.styles?.style_no} (Target: {plan.target_qty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPlanId && (
        <>
          {/* Running Totals Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Output</p>
              <p className="text-lg font-bold text-primary">{totals.produced}</p>
              <p className="text-[10px] text-muted-foreground">/ {selectedPlan?.target_qty ?? 0}</p>
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Achievement</p>
              <p className={`text-lg font-bold ${achievement >= 90 ? 'text-success' : achievement >= 70 ? 'text-warning' : 'text-destructive'}`}>
                {achievement}%
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">DHU%</p>
              <p className={`text-lg font-bold ${parseFloat(dhu) <= 3 ? 'text-success' : 'text-destructive'}`}>
                {dhu}%
              </p>
            </div>
          </div>

          {/* Hour Slot Selector */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" /> Hour Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setActiveSlot(s => Math.max(1, s - 1))}
                  disabled={activeSlot === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1 overflow-x-auto flex-1 justify-center">
                  {HOUR_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className={`
                        h-9 w-9 rounded-md text-sm font-medium transition-colors shrink-0 relative
                        ${activeSlot === slot
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : filledSlots.has(slot)
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                      `}
                    >
                      {slot}
                      {filledSlots.has(slot) && activeSlot !== slot && (
                        <CheckCircle2 className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-success" />
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setActiveSlot(s => Math.min(10, s + 1))}
                  disabled={activeSlot === 10}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Entry Form */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Hour {activeSlot} Entry</span>
                {filledSlots.has(activeSlot) && (
                  <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                    Saved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Production */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Produced Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.produced_qty || ''}
                    onChange={e => updateField('produced_qty', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Checked Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.checked_qty || ''}
                    onChange={e => updateField('checked_qty', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Defects</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.defects || ''}
                    onChange={e => updateField('defects', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Rework</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.rework || ''}
                    onChange={e => updateField('rework', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Downtime & NPT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Downtime (mins)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.downtime_minutes || ''}
                    onChange={e => updateField('downtime_minutes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">NPT (mins)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.npt_minutes || ''}
                    onChange={e => updateField('npt_minutes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Downtime Reason */}
              {form.downtime_minutes > 0 && (
                <div>
                  <Label className="text-xs">Downtime Reason</Label>
                  <Select
                    value={form.downtime_reason}
                    onValueChange={v => updateField('downtime_reason', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOWNTIME_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Operators */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Operators Present</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.operators_present || ''}
                    onChange={e => updateField('operators_present', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Helpers Present</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.helpers_present || ''}
                    onChange={e => updateField('helpers_present', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !selectedPlanId}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveAndNext}
                  disabled={saveMutation.isPending || !selectedPlanId || activeSlot === 10}
                  className="flex-1"
                >
                  Save & Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Table */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Running Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Output</span>
                  <span className="font-medium">{totals.produced}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Checked</span>
                  <span className="font-medium">{totals.checked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Defects</span>
                  <span className="font-medium text-destructive">{totals.defects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Rework</span>
                  <span className="font-medium">{totals.rework}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downtime</span>
                  <span className="font-medium">{totals.downtime} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NPT</span>
                  <span className="font-medium">{totals.npt} mins</span>
                </div>
                <div className="flex justify-between col-span-2 pt-1 border-t border-border">
                  <span className="text-muted-foreground">Hours Filled</span>
                  <span className="font-medium">{filledSlots.size} / 10</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
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
    </div>
  );
}
