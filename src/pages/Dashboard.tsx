import { useMemo } from 'react';
import { KPIGrid } from '@/components/kpi/KPIGrid';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { computeAllKPIs } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveFilter } from '@/hooks/useActiveFilter';
import { useDashboardData, filterLineStatuses, filterDowntime, filterTopStats } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

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

  const filteredLines = useMemo(() => filterLineStatuses(lineStatuses, currentFilter), [lineStatuses, currentFilter]);
  const filteredDowntime = useMemo(() => filterDowntime(downtimeData, currentFilter), [downtimeData, currentFilter]);
  const filteredTopStats = useMemo(() => filterTopStats(topStats, currentFilter), [topStats, currentFilter]);

  const kpis = useMemo(() => {
    const results = computeAllKPIs(kpiInput);
    return results.map((kpi, i) => ({
      ...kpi,
      trend: (['up', 'down', 'up', 'flat', 'up', 'up', 'up', 'up', 'down', 'down', 'down', 'flat'] as const)[i],
    }));
  }, [kpiInput]);

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
              key={i}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <EfficiencyTrendChart data={trendData} />
        <DowntimeParetoChart data={filteredDowntime} />
      </div>

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
