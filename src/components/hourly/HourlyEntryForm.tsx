import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const HOUR_OPTIONS = [
  { slot: 1, label: '8:00–9:00' },
  { slot: 2, label: '9:00–10:00' },
  { slot: 3, label: '10:00–11:00' },
  { slot: 4, label: '11:00–12:00' },
  { slot: 5, label: '12:00–1:00' },
  { slot: 6, label: '2:00–3:00' },
  { slot: 7, label: '3:00–4:00' },
  { slot: 8, label: '4:00–5:00' },
  { slot: 9, label: '5:00–6:00' },
  { slot: 10, label: '6:00–7:00' },
];

interface HourlyRecord {
  id?: string;
  hour_slot: number;
  produced_qty: number;
  defects: number;
  rework: number;
  checked_qty: number;
  downtime_minutes: number;
  npt_minutes: number;
  operators_present: number;
  helpers_present: number;
  downtime_reason: string | null;
}

interface PlanWithHourly {
  id: string;
  target_qty: number;
  working_hours: number;
  planned_operators: number;
  planned_helpers: number;
  lines: { line_number: number; type: string; floor_id: string; floors: { id: string; name: string } };
  styles: { style_no: string; buyer?: string; smv?: number };
  hourly_records: HourlyRecord[];
}

interface Props {
  plans: PlanWithHourly[];
  planIds: string[];
}

interface InlineEntry {
  actual: string;
  rejects: string;
  remarks: string;
}

// Group plans by floor
function groupByFloor(plans: PlanWithHourly[], type: string) {
  const filtered = plans.filter(p => (p.lines?.type || 'sewing') === type);
  const grouped = new Map<string, { floorName: string; floorId: string; plans: PlanWithHourly[] }>();

  for (const plan of filtered) {
    const floorId = plan.lines?.floors?.id || 'unknown';
    const floorName = plan.lines?.floors?.name || 'Unknown Floor';
    if (!grouped.has(floorId)) {
      grouped.set(floorId, { floorName, floorId, plans: [] });
    }
    grouped.get(floorId)!.plans.push(plan);
  }

  // Sort plans within each floor by line number
  for (const group of grouped.values()) {
    group.plans.sort((a, b) => (a.lines?.line_number || 0) - (b.lines?.line_number || 0));
  }

  return Array.from(grouped.values());
}

export function HourlyEntryForm({ plans, planIds }: Props) {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState(() => {
    const hour = new Date().getHours();
    let slot = Math.max(1, Math.min(10, hour - 7));
    if (hour >= 13) slot = Math.max(1, Math.min(10, hour - 8));
    return slot;
  });
  const [activeDept, setActiveDept] = useState<'sewing' | 'finishing'>('sewing');
  const [entries, setEntries] = useState<Record<string, InlineEntry>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  const sewingPlans = useMemo(() => plans.filter(p => (p.lines?.type || 'sewing') === 'sewing'), [plans]);
  const finishingPlans = useMemo(() => plans.filter(p => p.lines?.type === 'finishing'), [plans]);
  const sewingFloors = useMemo(() => groupByFloor(plans, 'sewing'), [plans]);
  const finishingFloors = useMemo(() => groupByFloor(plans, 'finishing'), [plans]);

  const currentFloors = activeDept === 'sewing' ? sewingFloors : finishingFloors;
  const totalLines = activeDept === 'sewing' ? sewingPlans.length : finishingPlans.length;

  // Count filled entries for current slot
  const filledCount = useMemo(() => {
    const relevantPlans = activeDept === 'sewing' ? sewingPlans : finishingPlans;
    return relevantPlans.filter(p =>
      p.hourly_records.some(r => r.hour_slot === selectedSlot && r.produced_qty > 0)
    ).length;
  }, [sewingPlans, finishingPlans, activeDept, selectedSlot]);

  const getEntry = useCallback((planId: string): InlineEntry => {
    const key = `${planId}-${selectedSlot}`;
    if (entries[key]) return entries[key];

    const plan = plans.find(p => p.id === planId);
    const existing = plan?.hourly_records.find(r => r.hour_slot === selectedSlot);
    if (existing) {
      return {
        actual: existing.produced_qty > 0 ? String(existing.produced_qty) : '',
        rejects: existing.defects > 0 ? String(existing.defects) : '',
        remarks: '',
      };
    }
    return { actual: '', rejects: '', remarks: '' };
  }, [entries, plans, selectedSlot]);

  const updateEntry = useCallback((planId: string, field: keyof InlineEntry, value: string) => {
    const key = `${planId}-${selectedSlot}`;
    setEntries(prev => ({
      ...prev,
      [key]: { ...getEntry(planId), [field]: value },
    }));
  }, [selectedSlot, getEntry]);

  const saveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const entry = getEntry(planId);
      const plan = plans.find(p => p.id === planId);
      const existing = plan?.hourly_records.find(r => r.hour_slot === selectedSlot);
      const actual = parseInt(entry.actual) || 0;
      const rejects = parseInt(entry.rejects) || 0;

      const payload = {
        plan_id: planId,
        hour_slot: selectedSlot,
        produced_qty: actual,
        defects: rejects,
        rework: 0,
        checked_qty: actual,
        downtime_minutes: 0,
        npt_minutes: 0,
        operators_present: plan?.planned_operators ?? 0,
        helpers_present: plan?.planned_helpers ?? 0,
        downtime_reason: null,
      };

      if (existing?.id) {
        const { error } = await supabase.from('hourly_production').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hourly_production').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourly-production-all', planIds] });
      toast.success('Saved');
      setSavingPlanId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save');
      setSavingPlanId(null);
    },
  });

  const handleSaveRow = (planId: string) => {
    setSavingPlanId(planId);
    saveMutation.mutate(planId);
  };

  const handleSaveAll = () => {
    const relevantPlans = activeDept === 'sewing' ? sewingPlans : finishingPlans;
    for (const plan of relevantPlans) {
      const entry = getEntry(plan.id);
      if (entry.actual) {
        saveMutation.mutate(plan.id);
      }
    }
  };

  const getFloorLabel = (floorName: string, index: number, type: string) => {
    if (type === 'sewing') return `Sewing Floor ${index + 1} (${floorName})`;
    return `Finishing Floor ${index + 1} (${floorName})`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[1.5px]">
        <CardContent className="py-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Hourly Production Entry — All Lines
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sewingPlans.length} Sewing Lines ({sewingFloors.length > 0 ? `${Math.round(sewingPlans.length / sewingFloors.length)}/floor × ${sewingFloors.length} floors` : '0'})
                {finishingPlans.length > 0 && ` + ${finishingPlans.length} Finishing Lines (${finishingFloors.length > 0 ? `${Math.round(finishingPlans.length / finishingFloors.length)}/floor × ${finishingFloors.length} floors` : '0'})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Hour:</span>
                <Select value={String(selectedSlot)} onValueChange={v => setSelectedSlot(parseInt(v))}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(h => (
                      <SelectItem key={h.slot} value={String(h.slot)} className="text-xs">{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                {filledCount} / {totalLines} filled
              </Badge>
            </div>
          </div>

          {/* Department Tabs */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setActiveDept('sewing')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                activeDept === 'sewing'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              🧵 Sewing ({sewingPlans.length} Lines)
            </button>
            {finishingPlans.length > 0 && (
              <button
                onClick={() => setActiveDept('finishing')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                  activeDept === 'finishing'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                ✂️ Finishing ({finishingPlans.length} Lines)
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floor Groups */}
      {currentFloors.map((floor, fi) => (
        <Card key={floor.floorId} className="border-[1.5px] animate-fade-in" style={{ animationDelay: `${fi * 60}ms`, animationFillMode: 'both' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2">
              {getFloorLabel(floor.floorName, fi, activeDept)}
              <span className="text-muted-foreground font-normal text-xs">({floor.plans.length} lines)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2 font-semibold text-primary w-[80px]">Line</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary">Buyer · Style</th>
                    <th className="text-right px-4 py-2 font-semibold text-primary w-[80px]">Target/hr</th>
                    <th className="text-center px-4 py-2 font-semibold text-primary w-[90px]">Actual</th>
                    <th className="text-center px-4 py-2 font-semibold text-primary w-[90px]">Rejects</th>
                    <th className="text-center px-4 py-2 font-semibold text-primary w-[60px]">Eff%</th>
                    <th className="text-center px-4 py-2 font-semibold text-primary w-[110px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {floor.plans.map((plan) => {
                    const entry = getEntry(plan.id);
                    const hourlyTarget = Math.round(plan.target_qty / (plan.working_hours || 8));
                    const actual = parseInt(entry.actual) || 0;
                    const eff = hourlyTarget > 0 && actual > 0 ? ((actual / hourlyTarget) * 100).toFixed(0) : '';
                    const existing = plan.hourly_records.find(r => r.hour_slot === selectedSlot);
                    const isSaved = !!existing;

                    return (
                      <tr key={plan.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">
                          Line {plan.lines?.line_number}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {plan.styles?.buyer ? `${plan.styles.buyer} · ` : ''}{plan.styles?.style_no}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {hourlyTarget.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={entry.actual}
                            onChange={e => updateEntry(plan.id, 'actual', e.target.value)}
                            onBlur={() => entry.actual && handleSaveRow(plan.id)}
                            className="h-8 w-[75px] mx-auto text-center text-xs"
                            placeholder=""
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={entry.rejects}
                            onChange={e => updateEntry(plan.id, 'rejects', e.target.value)}
                            onBlur={() => entry.actual && handleSaveRow(plan.id)}
                            className="h-8 w-[75px] mx-auto text-center text-xs"
                            placeholder=""
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {eff ? (
                            <span className={cn(
                              'font-bold',
                              Number(eff) >= 100 ? 'text-success' : Number(eff) >= 80 ? 'text-warning' : 'text-pink'
                            )}>
                              {eff}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="text"
                            value={entry.remarks}
                            onChange={e => updateEntry(plan.id, 'remarks', e.target.value)}
                            className="h-8 w-[100px] mx-auto text-xs"
                            placeholder="Remarks..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save All Button */}
      {currentFloors.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save All Entries
          </Button>
        </div>
      )}

      {plans.length === 0 && (
        <Card className="border-[1.5px]">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No production plans found for today.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
