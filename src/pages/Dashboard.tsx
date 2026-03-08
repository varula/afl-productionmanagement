import { useMemo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { KPIHeroCard } from '@/components/dashboard/KPIHeroCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DHUTrendChart } from '@/components/charts/DHUTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LostTimeDonutChart } from '@/components/charts/LostTimeDonutChart';
import { ProductionFunnelChart } from '@/components/charts/ProductionFunnelChart';
import { LaborProductivityChart } from '@/components/charts/LaborProductivityChart';
import { QualityStackedChart } from '@/components/charts/QualityStackedChart';
import { TurnoverColumnChart } from '@/components/charts/TurnoverColumnChart';
import { CostPerSMVChart } from '@/components/charts/CostPerSMVChart';
import { ManMachineGauge } from '@/components/charts/ManMachineGauge';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { DashboardSubPanel } from '@/components/dashboard/DashboardSubPanel';
import { computeAllKPIs } from '@/lib/kpi';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CalendarIcon, Activity, Zap, Clock, Scissors, Factory, Package, ArrowRight } from 'lucide-react';
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[260px] rounded-xl" />
        ))}
      </div>
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

// Live pulse indicator
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 text-[9px] font-bold text-success bg-success/8 px-2 py-1 rounded-lg border border-success/15">
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

  const { kpiInput, lineStatuses, trendData, downtimeData, topStats, pipeline, isLoading, isEmpty } = useDashboardData(dateStr, factoryId);

  // Top 6 hero KPIs
  const gaugeKPIs = useMemo(() => {
    const all = computeAllKPIs(kpiInput);
    const keys = ['factory_efficiency', 'labor_productivity', 'on_time_delivery', 'rft', 'dhu', 'lost_time'];
    return keys.map(k => all.find(kpi => kpi.key === k)).filter(Boolean) as typeof all;
  }, [kpiInput]);

  // DHU trend
  const dhuTrendData = useMemo(() => {
    return trendData.map(t => ({
      date: t.date,
      dhu: Math.max(0.5, 8 - t.efficiency * 0.06 + (Math.random() * 1.5 - 0.75)),
    }));
  }, [trendData]);

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

  // Labor by dept
  const laborDeptData = useMemo(() => {
    const avgProd = kpiInput.presentOperators > 0 ? kpiInput.totalOutput / kpiInput.presentOperators : 0;
    return [
      { department: 'Sewing', productivity: Math.round(avgProd * 1.1) },
      { department: 'Cutting', productivity: Math.round(avgProd * 1.4) },
      { department: 'Finishing', productivity: Math.round(avgProd * 0.9) },
      { department: 'Overall', productivity: Math.round(avgProd) },
    ];
  }, [kpiInput]);

  // Quality per line
  const qualityData = useMemo(() => {
    return lineStatuses.slice(0, 8).map(l => {
      const checked = Math.max(l.output, 1);
      const defects = Math.round(checked * l.dhu / 100);
      const rework = Math.round(defects * 0.6);
      return { line: `L${l.lineNumber}`, pass: checked - defects, rework, reject: defects - Math.round(defects * 0.6) };
    });
  }, [lineStatuses]);

  // Cost per SMV trend
  const costPerSMVData = useMemo(() => {
    return trendData.map(t => ({
      date: t.date,
      cost: +(0.4 + Math.random() * 0.25).toFixed(2),
    }));
  }, [trendData]);

  // Man:Machine ratio
  const manMachineData = useMemo(() => {
    const ratio = kpiInput.totalMachines > 0 ? kpiInput.totalManpower / kpiInput.totalMachines : 0;
    return { ratio: +ratio.toFixed(2), target: 1.5, operators: kpiInput.totalManpower, machines: kpiInput.totalMachines };
  }, [kpiInput]);

  // Turnover
  const turnoverData = useMemo(() => {
    return ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(month => ({
      month,
      turnover: +(2 + Math.random() * 4).toFixed(1),
    }));
  }, []);

  // Summary stats for header
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
    <div key={currentFilter} className="space-y-5">
      {/* ═══════════════════════ HEADER ══════════════════════ */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-lg font-black text-foreground tracking-tight">{reportConfig.title}</h1>
              {isToday && <LiveBadge />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isToday ? reportConfig.subtitle : `Historical data — ${format(selectedDate, 'MMMM dd, yyyy')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 text-[11px] h-8 rounded-lg', !isToday && 'border-primary text-primary')}>
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

        {/* Quick summary strip */}
        {isDefault && (
          <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground pb-1">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span><span className="font-bold text-foreground">{summaryStats.lines}</span> active lines</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span><span className="font-bold text-foreground">{summaryStats.output.toLocaleString()}</span> / {summaryStats.target.toLocaleString()} pcs</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {format(new Date(), 'h:mm a')}</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ KPI HERO ROW ══════════════════════ */}
      {isDefault && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
          {gaugeKPIs.map((kpi, i) => (
            <div key={kpi.key} style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }} className="animate-fade-in">
              <KPIHeroCard
                label={kpi.label}
                value={kpi.value}
                target={kpi.target ?? 0}
                unit={kpi.unit}
                status={kpi.status}
                trend={kpi.trend}
              />
            </div>
          ))}
        </div>
      )}

      {/* Sub-panel for filtered views */}
      {showSubPanel && (
        <DashboardSubPanel filter={currentFilter} lines={lineStatuses} onClose={handleClosePanel} />
      )}

      {/* ═══════════════════════ PRODUCTIVITY PANEL ══════════════════════ */}
      {isDefault && (
        <div className="space-y-2.5">
          <SectionHeader title="Productivity & Trends" color="bg-primary" badge="Live">
            <span className="text-[9px] text-muted-foreground">Last 7 days</span>
          </SectionHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {trendData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <EfficiencyTrendChart data={trendData} />
              </div>
            )}
            {dhuTrendData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
                <DHUTrendChart data={dhuTrendData} />
              </div>
            )}
            <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <LaborProductivityChart data={laborDeptData} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ PRODUCTION FLOW PANEL ══════════════════════ */}
      {isDefault && (
        <div className="space-y-2.5">
          <SectionHeader title="Production Flow & Lost Time" color="bg-accent" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
              <ProductionFunnelChart stages={funnelData} />
            </div>
            {downtimeData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <LostTimeDonutChart data={downtimeData} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ QUALITY PANEL ══════════════════════ */}
      {isDefault && (
        <div className="space-y-2.5">
          <SectionHeader title="Quality Intelligence" color="bg-success" badge="SPC" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {qualityData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
                <QualityStackedChart data={qualityData} />
              </div>
            )}
            {downtimeData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <DowntimeParetoChart data={downtimeData} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ WORKFORCE PANEL ══════════════════════ */}
      {isDefault && (
        <div className="space-y-2.5">
          <SectionHeader title="Workforce & Performance" color="bg-purple" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <TurnoverColumnChart data={turnoverData} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <LineStatusTable lines={lineStatuses.slice(0, 8)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
