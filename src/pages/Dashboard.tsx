import { useMemo } from 'react';
import { KPIGrid } from '@/components/kpi/KPIGrid';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { computeAllKPIs } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveFilter } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import type { LineStatus } from '@/components/dashboard/LineStatusTable';
import type { TopStat } from '@/hooks/useDashboardData';
import type { KPIInput } from '@/lib/kpi';

const REPORT_CONFIG: Record<string, { title: string; subtitle: string }> = {
  'dash-default': { title: 'Production Summary', subtitle: 'Factory-wide overview for today' },
  'dash-output': { title: 'Daily Output Report', subtitle: 'Detailed output breakdown by line' },
  'dash-orderstatus': { title: 'Order Status Overview', subtitle: 'Active production plans' },
  'dash-shipments': { title: 'Shipment Tracker', subtitle: 'Shipment progress' },
  'dash-delays': { title: 'Delay Analysis', subtitle: 'Delayed & at-risk lines' },
  'dash-lineeff': { title: 'Line Efficiency', subtitle: 'Efficiency ranking across all lines' },
  'dash-attendance': { title: 'Attendance Log', subtitle: 'Worker attendance overview' },
  'dash-machines': { title: 'Machine Status', subtitle: 'Machine downtime analysis' },
  'dash-qcsummary': { title: 'QC Summary', subtitle: 'Quality metrics overview' },
  'dash-buyers': { title: 'Buyer Performance', subtitle: 'Performance by buyer' },
  'dash-inventory': { title: 'Inventory Snapshot', subtitle: 'Material status' },
  'dash-period': { title: 'Period Comparison', subtitle: 'Trend comparison' },
};

const colorMap = {
  success: { bg: 'bg-success/10', icon: 'text-success', border: 'border-success/20' },
  primary: { bg: 'bg-primary/10', icon: 'text-primary', border: 'border-primary/20' },
  accent: { bg: 'bg-accent/10', icon: 'text-accent', border: 'border-accent/20' },
  pink: { bg: 'bg-pink/10', icon: 'text-pink', border: 'border-pink/20' },
  purple: { bg: 'bg-purple/10', icon: 'text-purple', border: 'border-purple/20' },
  warning: { bg: 'bg-warning/10', icon: 'text-warning', border: 'border-warning/20' },
};

// Which KPI keys to show per report filter
const KPI_FILTER_MAP: Record<string, string[]> = {
  'dash-lineeff': ['factory_efficiency', 'labor_productivity', 'man_to_machine', 'lost_time'],
  'dash-qcsummary': ['rft', 'dhu'],
  'dash-attendance': ['absenteeism', 'employee_turnover', 'labor_productivity'],
  'dash-machines': ['lost_time', 'man_to_machine'],
  'dash-delays': ['factory_efficiency', 'lost_time', 'absenteeism'],
  'dash-output': ['factory_efficiency', 'labor_productivity', 'cut_to_ship', 'order_to_ship'],
  'dash-orderstatus': ['on_time_delivery', 'order_to_ship', 'cut_to_ship'],
  'dash-shipments': ['cut_to_ship', 'order_to_ship', 'on_time_delivery'],
  'dash-buyers': ['factory_efficiency', 'rft', 'dhu', 'on_time_delivery'],
  'dash-inventory': ['cut_to_ship', 'order_to_ship'],
};

function buildFilteredTopStats(lines: LineStatus[], fullStats: TopStat[], filter: string): TopStat[] {
  // Recalculate stats from filtered lines
  const totalOutput = lines.reduce((s, l) => s + l.output, 0);
  const totalTarget = lines.reduce((s, l) => s + l.target, 0);
  const achievementPct = totalTarget > 0 ? (totalOutput / totalTarget) * 100 : 0;
  const onTrack = lines.filter(l => l.status === 'on_track').length;
  const behind = lines.filter(l => l.status === 'behind').length;
  const atRisk = lines.filter(l => l.status === 'at_risk').length;
  const avgEff = lines.length > 0 ? lines.reduce((s, l) => s + l.efficiency, 0) / lines.length : 0;
  const avgDhu = lines.length > 0 ? lines.reduce((s, l) => s + l.dhu, 0) / lines.length : 0;

  const recalculated: TopStat[] = [
    { label: 'Achievement', value: `${achievementPct.toFixed(1)}%`, trend: `${totalOutput.toLocaleString()} / ${totalTarget.toLocaleString()} pcs`, up: achievementPct >= 90, color: achievementPct >= 90 ? 'success' : 'pink' },
    { label: 'Active Lines', value: `${lines.length}`, trend: `${onTrack} on track`, up: true, color: 'primary' },
    { label: 'Units Produced', value: totalOutput.toLocaleString(), trend: `Target ${totalTarget.toLocaleString()}`, up: totalOutput >= totalTarget * 0.9, color: 'accent' },
    { label: 'Delayed Lines', value: `${behind}`, trend: `${atRisk} at risk`, up: false, color: 'pink' },
    { label: 'Avg Efficiency', value: `${avgEff.toFixed(1)}%`, trend: `Across ${lines.length} lines`, up: avgEff >= 65, color: avgEff >= 65 ? 'success' : 'warning' },
    { label: 'Avg DHU', value: `${avgDhu.toFixed(1)}%`, trend: `Quality metric`, up: avgDhu <= 5, color: avgDhu <= 5 ? 'success' : 'warning' },
  ];

  // For QC/Attendance/Machine filters, pull from full stats for non-line-derived metrics
  const workersStat = fullStats.find(s => s.label === 'Workers Present');
  const downtimeStat = fullStats.find(s => s.label === 'Downtime Events');
  const qcStat = fullStats.find(s => s.label === 'QC Pass Rate');

  switch (filter) {
    case 'dash-qcsummary':
      return [recalculated[0], ...(qcStat ? [qcStat] : []), recalculated[5], recalculated[1]];
    case 'dash-attendance':
      return [...(workersStat ? [workersStat] : []), recalculated[1], recalculated[0]];
    case 'dash-machines':
      return [...(downtimeStat ? [downtimeStat] : []), recalculated[3], recalculated[4]];
    case 'dash-delays':
      return [recalculated[3], recalculated[4], recalculated[2]];
    case 'dash-lineeff':
      return [recalculated[4], recalculated[0], recalculated[1], recalculated[2]];
    case 'dash-orderstatus':
    case 'dash-shipments':
      return [recalculated[0], recalculated[1], recalculated[3]];
    case 'dash-buyers':
      return [recalculated[0], recalculated[2], recalculated[4], recalculated[5]];
    case 'dash-inventory':
      return [recalculated[2], recalculated[3]];
    case 'dash-output':
      return [recalculated[0], recalculated[2], recalculated[4], recalculated[1]];
    default:
      return recalculated.slice(0, 4).concat(
        ...(qcStat ? [qcStat] : []),
        ...(workersStat ? [workersStat] : []),
        ...(downtimeStat ? [downtimeStat] : []),
        recalculated[4],
      );
  }
}

function filterLineStatuses(lines: LineStatus[], filter: string): LineStatus[] {
  switch (filter) {
    case 'dash-lineeff': return [...lines].sort((a, b) => b.efficiency - a.efficiency);
    case 'dash-delays': return lines.filter(l => l.status === 'behind' || l.status === 'at_risk');
    case 'dash-qcsummary': return [...lines].sort((a, b) => b.dhu - a.dhu);
    case 'dash-output': return [...lines].sort((a, b) => b.output - a.output);
    case 'dash-machines': return lines.filter(l => l.status !== 'on_track');
    default: return lines;
  }
}

function filterDowntime(data: { reason: string; minutes: number }[], filter: string) {
  if (filter === 'dash-machines') return data.filter(d => d.reason === 'machine_breakdown' || d.reason === 'maintenance');
  if (filter === 'dash-qcsummary') return data.filter(d => d.reason === 'quality_issue');
  if (filter === 'dash-delays') return data.filter(d => ['machine_breakdown', 'no_feeding', 'power_failure'].includes(d.reason));
  return data;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <BarChart3 className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">No production data for today</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Create production plans for today to see live dashboard data. Go to Production Plan Entry to get started.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const activeFilter = useActiveFilter();
  const currentFilter = activeFilter || 'dash-default';
  const reportConfig = REPORT_CONFIG[currentFilter] || REPORT_CONFIG['dash-default'];

  const { kpiInput, lineStatuses, trendData, downtimeData, topStats, pipeline, isLoading, isEmpty } = useDashboardData();

  // Filter lines first — then derive everything else from filtered lines
  const filteredLines = useMemo(() => filterLineStatuses(lineStatuses, currentFilter), [lineStatuses, currentFilter]);
  const filteredDowntime = useMemo(() => filterDowntime(downtimeData, currentFilter), [downtimeData, currentFilter]);
  const filteredTopStats = useMemo(() => buildFilteredTopStats(filteredLines, topStats, currentFilter), [filteredLines, topStats, currentFilter]);

  // Recalculate KPIs from filtered lines where possible
  const filteredKpiInput = useMemo((): KPIInput => {
    if (currentFilter === 'dash-default' || currentFilter === 'dash-period') return kpiInput;

    // Rebuild a partial KPI input from filtered line data
    const totalOutput = filteredLines.reduce((s, l) => s + l.output, 0);
    const totalTarget = filteredLines.reduce((s, l) => s + l.target, 0);
    const totalDefects = filteredLines.reduce((s, l) => s + Math.round(l.dhu * l.output / 100), 0);
    const totalChecked = totalOutput;

    return {
      ...kpiInput,
      totalOutput,
      totalTarget,
      totalDefects,
      totalChecked: totalChecked || 1,
      totalManpower: Math.round(kpiInput.totalManpower * (filteredLines.length / Math.max(lineStatuses.length, 1))),
      totalMachines: Math.round(kpiInput.totalMachines * (filteredLines.length / Math.max(lineStatuses.length, 1))),
      plannedOperators: Math.round(kpiInput.plannedOperators * (filteredLines.length / Math.max(lineStatuses.length, 1))),
      presentOperators: Math.round(kpiInput.presentOperators * (filteredLines.length / Math.max(lineStatuses.length, 1))),
      totalOrders: filteredLines.length,
      shippedQty: totalOutput,
      orderedQty: totalTarget,
      cutQty: totalTarget,
      totalSamProduced: totalOutput * kpiInput.weightedSmv,
    };
  }, [kpiInput, filteredLines, lineStatuses, currentFilter]);

  const kpis = useMemo(() => {
    const results = computeAllKPIs(filteredKpiInput);
    const allowedKeys = KPI_FILTER_MAP[currentFilter];
    const filtered = allowedKeys ? results.filter(k => allowedKeys.includes(k.key)) : results;
    return filtered.map((kpi, i) => ({
      ...kpi,
      trend: (['up', 'down', 'up', 'flat', 'up', 'up', 'up', 'up', 'down', 'down', 'down', 'flat'] as const)[i % 12],
    }));
  }, [filteredKpiInput, currentFilter]);

  // Filter trend data for certain reports
  const filteredTrend = useMemo(() => {
    if (currentFilter === 'dash-qcsummary' || currentFilter === 'dash-machines' || currentFilter === 'dash-attendance') {
      return []; // These reports don't need efficiency trend
    }
    return trendData;
  }, [trendData, currentFilter]);

  if (isLoading) return <DashboardSkeleton />;
  if (isEmpty) return <EmptyState />;

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{reportConfig.title}</h1>
        <p className="text-sm text-muted-foreground">{reportConfig.subtitle}</p>
      </div>

      {/* Top Stats Grid */}
      <div className={`grid grid-cols-2 ${filteredTopStats.length <= 4 ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-3`}>
        {filteredTopStats.map((stat, i) => {
          const colors = colorMap[stat.color];
          return (
            <div
              key={`${stat.label}-${i}`}
              className={`rounded-xl border-[1.5px] ${colors.border} bg-card p-3.5 flex items-start gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer animate-pop-in`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-[10px] ${colors.bg} flex items-center justify-center shrink-0`}>
                <div className={`w-5 h-5 rounded-full ${colors.bg}`} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-foreground tracking-tight leading-tight">{stat.value}</div>
                <div className="text-[10.5px] text-muted-foreground font-medium mt-0.5">{stat.label}</div>
                <div className={`text-[10px] font-semibold mt-0.5 ${stat.up ? 'text-success' : 'text-pink'}`}>
                  {stat.trend}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {(filteredTrend.length > 0 || filteredDowntime.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredTrend.length > 0 && <EfficiencyTrendChart data={filteredTrend} />}
          {filteredDowntime.length > 0 && <DowntimeParetoChart data={filteredDowntime} />}
        </div>
      )}

      {/* Production Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold">Production Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipeline.map(item => (
              <div key={item.stage} className="flex items-center gap-2 bg-muted rounded-lg border border-border px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <span className="text-[11.5px] font-semibold text-foreground flex-1">{item.stage}</span>
                <span className="text-xs font-extrabold text-foreground">{item.qty}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* KPI Summary Cards */}
        <div className="lg:col-span-2">
          <KPIGrid kpis={kpis} />
        </div>
      </div>

      {/* Line Status */}
      <LineStatusTable lines={filteredLines} />
    </div>
  );
}
