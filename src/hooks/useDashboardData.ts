import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import type { KPIInput } from '@/lib/kpi';
import type { LineStatus } from '@/components/dashboard/LineStatusTable';

const today = () => format(new Date(), 'yyyy-MM-dd');

export interface DashboardData {
  kpiInput: KPIInput;
  lineStatuses: LineStatus[];
  trendData: { date: string; efficiency: number; target: number }[];
  downtimeData: { reason: string; minutes: number }[];
  topStats: TopStat[];
  pipeline: PipelineStage[];
  isLoading: boolean;
  isEmpty: boolean;
}

export interface TopStat {
  label: string;
  value: string;
  trend: string;
  up: boolean;
  color: 'success' | 'primary' | 'accent' | 'pink' | 'purple' | 'warning';
}

export interface PipelineStage {
  stage: string;
  qty: string;
  color: string;
}

export function useDashboardData(selectedDate?: string): DashboardData {
  const todayStr = selectedDate || today();

  // 1. Production plans for today with line + style info
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['dashboard-plans', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, lines!inner(id, line_number, type, machine_count, operator_count, helper_count, is_active, supervisor), styles!inner(style_no, buyer, smv, sam, target_efficiency)')
        .eq('date', todayStr);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // 2. Hourly production for today's plans
  const planIds = (plans ?? []).map(p => p.id);
  const { data: hourlyRows, isLoading: hourlyLoading } = useQuery({
    queryKey: ['dashboard-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('*')
        .in('plan_id', planIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: planIds.length > 0,
    staleTime: 30_000,
  });

  // 3. Downtime for today
  const { data: downtimeRows, isLoading: downtimeLoading } = useQuery({
    queryKey: ['dashboard-downtime', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('downtime')
        .select('*')
        .gte('occurred_at', `${todayStr}T00:00:00`)
        .lte('occurred_at', `${todayStr}T23:59:59`);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // 4. Factory daily summary for trend (last 8 days)
  const { data: summaryRows, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-trend'],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('factory_daily_summary')
        .select('*')
        .gte('date', startDate)
        .order('date');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const isLoading = plansLoading || hourlyLoading || downtimeLoading || summaryLoading;
  const isEmpty = !isLoading && (!plans || plans.length === 0);

  // Aggregate hourly by plan
  const hourlyByPlan = new Map<string, {
    output: number; defects: number; rework: number; checked: number;
    downtime: number; npt: number; operators: number; helpers: number;
  }>();
  for (const h of (hourlyRows ?? [])) {
    const existing = hourlyByPlan.get(h.plan_id) ?? { output: 0, defects: 0, rework: 0, checked: 0, downtime: 0, npt: 0, operators: 0, helpers: 0 };
    existing.output += h.produced_qty;
    existing.defects += h.defects;
    existing.rework += h.rework;
    existing.checked += h.checked_qty;
    existing.downtime += h.downtime_minutes;
    existing.npt += h.npt_minutes;
    existing.operators = Math.max(existing.operators, h.operators_present);
    existing.helpers = Math.max(existing.helpers, h.helpers_present);
    hourlyByPlan.set(h.plan_id, existing);
  }

  // Compute totals
  let totalOutput = 0, totalTarget = 0, totalDefects = 0, totalChecked = 0, totalRework = 0;
  let totalDowntime = 0, totalNpt = 0, totalManpower = 0, totalMachines = 0;
  let totalWorkingMinutes = 0, plannedOperators = 0, presentOperators = 0;
  let smvWeightSum = 0, weightSum = 0;

  for (const plan of (plans ?? [])) {
    const hourly = hourlyByPlan.get(plan.id);
    const style = plan.styles as any;
    const line = plan.lines as any;

    totalTarget += plan.target_qty;
    totalWorkingMinutes += (plan.working_hours ?? 8) * 60;
    plannedOperators += plan.planned_operators;
    totalMachines += line.machine_count ?? 0;

    if (hourly) {
      totalOutput += hourly.output;
      totalDefects += hourly.defects;
      totalChecked += hourly.checked;
      totalRework += hourly.rework;
      totalDowntime += hourly.downtime;
      totalNpt += hourly.npt;
      presentOperators += hourly.operators;
      totalManpower += hourly.operators + hourly.helpers;
    } else {
      presentOperators += plan.planned_operators;
      totalManpower += plan.planned_operators + plan.planned_helpers;
    }

    smvWeightSum += style.smv * plan.target_qty;
    weightSum += plan.target_qty;
  }

  const weightedSmv = weightSum > 0 ? smvWeightSum / weightSum : 0;
  const avgWorkingMins = (plans?.length ?? 0) > 0 ? totalWorkingMinutes / plans!.length : 480;

  const kpiInput: KPIInput = {
    totalOutput,
    totalTarget,
    totalManpower: totalManpower || plannedOperators,
    totalMachines,
    totalWorkingMinutes: avgWorkingMins,
    totalDowntimeMinutes: totalDowntime,
    totalNptMinutes: totalNpt,
    totalDefects,
    totalChecked: totalChecked || totalOutput,
    totalRework,
    weightedSmv,
    plannedOperators,
    presentOperators: presentOperators || plannedOperators,
    totalLaborCost: 0,
    totalSamProduced: totalOutput * weightedSmv,
    cutQty: totalTarget,
    shippedQty: totalOutput,
    orderedQty: totalTarget,
    onTimeOrders: 0,
    totalOrders: plans?.length ?? 0,
    separations: 0,
    avgHeadcount: plannedOperators,
  };

  // Line statuses
  const lineStatuses: LineStatus[] = (plans ?? []).map(plan => {
    const hourly = hourlyByPlan.get(plan.id);
    const style = plan.styles as any;
    const line = plan.lines as any;
    const output = hourly?.output ?? 0;
    const target = plan.target_qty;
    const operators = hourly?.operators || plan.planned_operators;
    const workMins = (plan.working_hours ?? 8) * 60;
    const eff = operators > 0 && workMins > 0
      ? (output * style.smv) / (operators * workMins) * 100
      : 0;
    const achievement = target > 0 ? (output / target) * 100 : 0;
    const checked = hourly?.checked || output;
    const dhu = checked > 0 ? ((hourly?.defects ?? 0) / checked) * 100 : 0;
    const status: LineStatus['status'] = achievement >= 90 ? 'on_track' : achievement >= 80 ? 'at_risk' : 'behind';

    return {
      lineNumber: line.line_number,
      style: `${style.style_no} (${style.buyer})`,
      target,
      output,
      efficiency: Math.round(eff * 10) / 10,
      achievement: Math.round(achievement * 10) / 10,
      dhu: Math.round(dhu * 10) / 10,
      status,
    };
  }).sort((a, b) => a.lineNumber - b.lineNumber);

  // Downtime grouped by reason
  const downtimeMap = new Map<string, number>();
  for (const d of (downtimeRows ?? [])) {
    downtimeMap.set(d.reason, (downtimeMap.get(d.reason) ?? 0) + d.minutes);
  }
  const downtimeData = Array.from(downtimeMap.entries())
    .map(([reason, minutes]) => ({ reason, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // Trend data from factory_daily_summary
  const trendData = (summaryRows ?? []).map(s => ({
    date: format(new Date(s.date), 'MMM dd'),
    efficiency: Number(s.efficiency_pct) || 0,
    target: 65,
  }));

  // Top stats
  const effPct = totalManpower > 0 && avgWorkingMins > 0
    ? (totalOutput * weightedSmv) / (totalManpower * avgWorkingMins) * 100 : 0;
  const attendancePct = plannedOperators > 0
    ? (presentOperators / plannedOperators) * 100 : 0;
  const qcPassRate = totalChecked > 0
    ? ((totalChecked - totalDefects) / totalChecked) * 100 : 0;
  const machinesDown = (downtimeRows ?? []).filter(d => d.reason === 'machine_breakdown').length;
  const achievementPct = totalTarget > 0 ? (totalOutput / totalTarget) * 100 : 0;

  const topStats: TopStat[] = [
    { label: 'Achievement', value: `${achievementPct.toFixed(1)}%`, trend: `${totalOutput.toLocaleString()} / ${totalTarget.toLocaleString()} pcs`, up: achievementPct >= 90, color: achievementPct >= 90 ? 'success' : 'pink' },
    { label: 'Active Lines', value: `${plans?.length ?? 0}`, trend: `${lineStatuses.filter(l => l.status === 'on_track').length} on track`, up: true, color: 'primary' },
    { label: 'Units Produced', value: totalOutput.toLocaleString(), trend: `Target ${totalTarget.toLocaleString()}`, up: totalOutput >= totalTarget * 0.9, color: 'accent' },
    { label: 'Delayed Lines', value: `${lineStatuses.filter(l => l.status === 'behind').length}`, trend: `${lineStatuses.filter(l => l.status === 'at_risk').length} at risk`, up: false, color: 'pink' },
    { label: 'QC Pass Rate', value: `${qcPassRate.toFixed(1)}%`, trend: `${totalDefects} defects / ${totalChecked} checked`, up: qcPassRate >= 95, color: qcPassRate >= 95 ? 'success' : 'warning' },
    { label: 'Workers Present', value: presentOperators.toLocaleString(), trend: `${attendancePct.toFixed(1)}% attendance`, up: attendancePct >= 95, color: 'purple' },
    { label: 'Downtime Events', value: `${(downtimeRows ?? []).length}`, trend: `${machinesDown} machine breakdowns`, up: false, color: 'warning' },
    { label: 'Overall Efficiency', value: `${effPct.toFixed(1)}%`, trend: `Weighted SMV ${weightedSmv.toFixed(1)}`, up: effPct >= 65, color: effPct >= 65 ? 'success' : 'warning' },
  ];

  // Pipeline - group by line type
  const typeOutputMap = new Map<string, number>();
  for (const plan of (plans ?? [])) {
    const line = plan.lines as any;
    const hourly = hourlyByPlan.get(plan.id);
    const type = line.type || 'sewing';
    typeOutputMap.set(type, (typeOutputMap.get(type) ?? 0) + (hourly?.output ?? 0));
  }

  const pipeline: PipelineStage[] = [
    { stage: `Sewing (${(plans ?? []).filter(p => (p.lines as any).type === 'sewing' || !(p.lines as any).type).length} Lines)`, qty: `${(typeOutputMap.get('sewing') ?? 0).toLocaleString()} pcs`, color: 'bg-purple' },
    { stage: 'QC Inline', qty: `${totalChecked.toLocaleString()} pcs`, color: 'bg-warning' },
    { stage: `Finishing`, qty: `${(typeOutputMap.get('finishing') ?? 0).toLocaleString()} pcs`, color: 'bg-success' },
    { stage: `Cutting`, qty: `${(typeOutputMap.get('cutting') ?? 0).toLocaleString()} pcs`, color: 'bg-primary' },
    { stage: 'Auxiliary', qty: `${(typeOutputMap.get('auxiliary') ?? 0).toLocaleString()} pcs`, color: 'bg-accent' },
  ];

  return { kpiInput, lineStatuses, trendData, downtimeData, topStats, pipeline, isLoading, isEmpty };
}

// Filter helpers for sidebar reports - operate on live data
export function filterLineStatuses(lines: LineStatus[], filter: string): LineStatus[] {
  switch (filter) {
    case 'dash-lineeff': return [...lines].sort((a, b) => b.efficiency - a.efficiency);
    case 'dash-delays': return lines.filter(l => l.status === 'behind' || l.status === 'at_risk');
    case 'dash-qcsummary': return [...lines].sort((a, b) => b.dhu - a.dhu);
    case 'dash-output': return [...lines].sort((a, b) => b.output - a.output);
    case 'dash-machines': return lines.filter(l => l.status !== 'on_track');
    case 'dash-attendance': return lines;
    default: return lines;
  }
}

export function filterDowntime(data: { reason: string; minutes: number }[], filter: string) {
  if (filter === 'dash-machines') return data.filter(d => d.reason === 'machine_breakdown' || d.reason === 'maintenance');
  if (filter === 'dash-qcsummary') return data.filter(d => d.reason === 'quality_issue');
  if (filter === 'dash-delays') return data.filter(d => ['machine_breakdown', 'no_feeding', 'power_failure'].includes(d.reason));
  return data;
}

export function filterTopStats(stats: TopStat[], filter: string): TopStat[] {
  switch (filter) {
    case 'dash-orderstatus': return stats.filter(s => s.label.includes('Active') || s.label.includes('Achievement') || s.label.includes('Delayed'));
    case 'dash-shipments': return stats.filter(s => s.label.includes('Delayed') || s.label.includes('Achievement') || s.label.includes('Active'));
    case 'dash-delays': return stats.filter(s => s.label.includes('Delayed') || s.label.includes('Efficiency') || s.label.includes('Units'));
    case 'dash-lineeff': return stats.filter(s => s.label.includes('Efficiency') || s.label.includes('Units'));
    case 'dash-attendance': return stats.filter(s => s.label.includes('Workers'));
    case 'dash-machines': return stats.filter(s => s.label.includes('Downtime'));
    case 'dash-qcsummary': return stats.filter(s => s.label.includes('QC'));
    case 'dash-buyers': return stats.filter(s => s.label.includes('Achievement') || s.label.includes('Active') || s.label.includes('Units'));
    case 'dash-inventory': return stats.filter(s => s.label.includes('Units') || s.label.includes('Delayed'));
    default: return stats;
  }
}
