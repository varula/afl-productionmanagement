import { useMemo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { KPIHeroCard } from '@/components/dashboard/KPIHeroCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { ProductionFunnelChart } from '@/components/charts/ProductionFunnelChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { DashboardSubPanel } from '@/components/dashboard/DashboardSubPanel';
import { computeAllKPIs } from '@/lib/kpi';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CalendarIcon, Activity, Zap, Clock, Scissors, Factory, Package, ArrowRight, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIInput } from '@/lib/kpi';

const REPORT_CONFIG: Record<string, { title: string; subtitle: string }> = {
  'dash-default': { title: 'Factory Command Center', subtitle: 'Real-time production intelligence' },
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

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple/20 flex items-center justify-center mb-5 ring-1 ring-primary/10">
        <BarChart3 className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">No production data for today</h2>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        Create production plans to activate the command center. Navigate to <span className="font-semibold text-foreground">Production Plan Entry</span> to get started.
      </p>
    </div>
  );
}

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/8 px-2.5 py-1 rounded-lg border border-success/15">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      LIVE
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();
  const currentFilter = activeFilter || 'dash-default';
  const reportConfig = REPORT_CONFIG[currentFilter] || REPORT_CONFIG['dash-default'];
  const [panelClosed, setPanelClosed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const showSubPanel = currentFilter !== 'dash-default' && !panelClosed;
  const handleClosePanel = useCallback(() => setPanelClosed(true), []);
  useEffect(() => { setPanelClosed(false); }, [currentFilter]);

  const { kpiInput, lineStatuses, trendData, downtimeData, topStats, pipeline, totalOTMinutes, otBySection, otByFloor, isLoading, isEmpty } = useDashboardData(dateStr, factoryId);

  // 4 hero KPIs
  const gaugeKPIs = useMemo(() => {
    const all = computeAllKPIs(kpiInput);
    const keys = ['factory_efficiency', 'dhu', 'lost_time'];
    const found = keys.map(k => all.find(kpi => kpi.key === k)).filter(Boolean) as typeof all;
    const achievementPct = kpiInput.totalTarget > 0 ? (kpiInput.totalOutput / kpiInput.totalTarget) * 100 : 0;
    found.unshift({
      key: 'achievement',
      label: 'Achievement',
      value: Math.round(achievementPct * 10) / 10,
      unit: '%',
      target: 100,
      status: achievementPct >= 90 ? 'success' : achievementPct >= 70 ? 'warning' : 'danger',
      trend: achievementPct >= 90 ? 'up' : 'down',
      description: 'Output vs target',
    });
    return found;
  }, [kpiInput]);

  // Funnel
  const funnelData = useMemo(() => {
    const totalTarget = kpiInput.totalTarget || 1000;
    const cutQty = kpiInput.cutQty || totalTarget;
    const sewOutput = kpiInput.totalOutput || Math.round(cutQty * 0.92);
    const finishOutput = Math.round(sewOutput * 0.96);
    const shipQty = kpiInput.shippedQty || Math.round(finishOutput * 0.98);
    return [
      { stage: 'Cutting', qty: cutQty, color: 'bg-primary' },
      { stage: 'Sewing', qty: sewOutput, color: 'bg-purple' },
      { stage: 'Finishing', qty: finishOutput, color: 'bg-success' },
      { stage: 'Shipment', qty: shipQty, color: 'bg-accent' },
    ];
  }, [kpiInput]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const eff = gaugeKPIs.find(k => k.key === 'factory_efficiency');
    return {
      lines: lineStatuses.length,
      output: kpiInput.totalOutput,
      target: kpiInput.totalTarget,
      efficiency: eff?.value ?? 0,
    };
  }, [lineStatuses, kpiInput, gaugeKPIs]);

  if (isLoading) return <DashboardSkeleton />;
  if (isEmpty) return <EmptyState />;

  const isDefault = currentFilter === 'dash-default';

  return (
    <div key={currentFilter} className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
              {isToday && <LiveBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              {isToday ? format(new Date(), 'EEEE, MMMM dd, yyyy') : `Historical data — ${format(selectedDate, 'MMMM dd, yyyy')}`}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-1.5 text-sm h-9 rounded-lg', !isToday && 'border-primary text-primary')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {isToday ? 'Today' : format(selectedDate, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} disabled={date => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ═══ KPI HERO ROW ═══ */}
      {isDefault && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 animate-fade-in">
          {gaugeKPIs.map((kpi, i) => (
            <div key={kpi.key} style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }} className="animate-fade-in min-w-0">
              <KPIHeroCard label={kpi.label} value={kpi.value} target={kpi.target ?? 0} unit={kpi.unit} status={kpi.status} trend={kpi.trend} />
            </div>
          ))}
        </div>
      )}

      {/* Sub-panel for filtered views */}
      {showSubPanel && (
        <DashboardSubPanel filter={currentFilter} lines={lineStatuses} onClose={handleClosePanel} />
      )}

      {/* ═══ DEPARTMENT DRILL-DOWN ═══ */}
      {isDefault && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-in">
          {[
            { key: 'cutting', label: 'Cutting', icon: Scissors, color: 'from-primary to-primary/70', path: '/dashboard/cutting' },
            { key: 'sewing', label: 'Sewing', icon: Factory, color: 'from-purple to-purple/70', path: '/dashboard/sewing' },
            { key: 'finishing', label: 'Finishing', icon: Package, color: 'from-success to-success/70', path: '/dashboard/finishing' },
            { key: 'overtime', label: 'Overtime', icon: Timer, color: 'from-warning to-warning/70', path: '/overtime' },
          ].map(dept => (
            <button
              key={dept.key}
              onClick={() => navigate(dept.path)}
              className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center shrink-0`}>
                <dept.icon className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[11px] font-bold text-foreground truncate">{dept.label}</div>
                <div className="text-[9px] text-muted-foreground">View details</div>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ═══ CHARTS: Efficiency Trend + Production Funnel ═══ */}
      {isDefault && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in">
          {trendData.length > 0 && <EfficiencyTrendChart data={trendData} />}
          <ProductionFunnelChart stages={funnelData} />
        </div>
      )}

      {/* ═══ DOWNTIME ═══ */}
      {isDefault && downtimeData.length > 0 && (
        <div className="animate-fade-in">
          <DowntimeParetoChart data={downtimeData} />
        </div>
      )}
    </div>
  );
}
