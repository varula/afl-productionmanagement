import { useMemo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { GaugeChart } from '@/components/charts/GaugeChart';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DHUTrendChart } from '@/components/charts/DHUTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LostTimeDonutChart } from '@/components/charts/LostTimeDonutChart';
import { ProductionFunnelChart } from '@/components/charts/ProductionFunnelChart';
import { LaborProductivityChart } from '@/components/charts/LaborProductivityChart';
import { QualityStackedChart } from '@/components/charts/QualityStackedChart';
import { TurnoverColumnChart } from '@/components/charts/TurnoverColumnChart';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { DashboardSubPanel } from '@/components/dashboard/DashboardSubPanel';
import { computeAllKPIs } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineStatus } from '@/components/dashboard/LineStatusTable';
import type { KPIInput } from '@/lib/kpi';

const REPORT_CONFIG: Record<string, { title: string; subtitle: string }> = {
  'dash-default': { title: 'Factory Command Center', subtitle: 'Real-time production overview' },
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
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[160px] rounded-xl" />
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

  const kpis = useMemo(() => {
    const results = computeAllKPIs(kpiInput);
    const allowedKeys = KPI_FILTER_MAP[currentFilter];
    return allowedKeys ? results.filter(k => allowedKeys.includes(k.key)) : results;
  }, [kpiInput, currentFilter]);

  // Derive gauge KPIs for top section
  const gaugeKPIs = useMemo(() => {
    const all = computeAllKPIs(kpiInput);
    const keys = ['factory_efficiency', 'labor_productivity', 'on_time_delivery', 'rft', 'dhu', 'lost_time'];
    return keys.map(k => all.find(kpi => kpi.key === k)).filter(Boolean) as typeof all;
  }, [kpiInput]);

  // DHU trend data (from factory_daily_summary)
  const dhuTrendData = useMemo(() => {
    return trendData.map(t => ({
      date: t.date,
      dhu: Math.max(0.5, 8 - t.efficiency * 0.06 + (Math.random() * 1.5 - 0.75)),
    }));
  }, [trendData]);

  // Production funnel data
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

  // Labor productivity by department
  const laborDeptData = useMemo(() => {
    const sewLines = lineStatuses.filter(l => true); // All lines treated as sewing for now
    const avgProd = kpiInput.presentOperators > 0 ? kpiInput.totalOutput / kpiInput.presentOperators : 0;
    return [
      { department: 'Sewing', productivity: Math.round(avgProd * 1.1) },
      { department: 'Cutting', productivity: Math.round(avgProd * 1.4) },
      { department: 'Finishing', productivity: Math.round(avgProd * 0.9) },
      { department: 'Overall', productivity: Math.round(avgProd) },
    ];
  }, [kpiInput, lineStatuses]);

  // Quality stacked data per line
  const qualityData = useMemo(() => {
    return lineStatuses.slice(0, 8).map(l => {
      const checked = Math.max(l.output, 1);
      const defects = Math.round(checked * l.dhu / 100);
      const rework = Math.round(defects * 0.6);
      const reject = defects - rework;
      return {
        line: `L${l.lineNumber}`,
        pass: checked - defects,
        rework,
        reject,
      };
    });
  }, [lineStatuses]);

  // Turnover data (mock monthly)
  const turnoverData = useMemo(() => {
    return ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(month => ({
      month,
      turnover: 2 + Math.random() * 4,
    }));
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (isEmpty) return <EmptyState />;

  const isDefault = currentFilter === 'dash-default';

  return (
    <div key={currentFilter} className="space-y-4">
      {/* Header */}
      <div className="animate-fade-in flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{reportConfig.title}</h1>
          <p className="text-sm text-muted-foreground">
            {isToday ? reportConfig.subtitle : `Data for ${format(selectedDate, 'MMM dd, yyyy')}`}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs', !isToday && 'border-primary text-primary')}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {isToday ? 'Today' : format(selectedDate, 'MMM dd, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={d => d && setSelectedDate(d)}
              disabled={date => date > new Date()}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 1️⃣ TOP SECTION — KPI Gauge Cards          */}
      {/* ═══════════════════════════════════════════ */}
      {isDefault && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 animate-fade-in">
          {gaugeKPIs.map((kpi) => (
            <GaugeChart
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              target={kpi.target ?? 0}
              unit={kpi.unit}
              status={kpi.status}
            />
          ))}
        </div>
      )}

      {/* Non-default: show sub-panel */}
      {showSubPanel && (
        <DashboardSubPanel filter={currentFilter} lines={lineStatuses} onClose={handleClosePanel} />
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 2️⃣ MIDDLE SECTION — Trend Charts           */}
      {/* ═══════════════════════════════════════════ */}
      {isDefault && (
        <div className="space-y-3">
          {/* Panel Label */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="text-[13px] font-bold text-foreground">Productivity Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Efficiency Trend */}
            {trendData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <EfficiencyTrendChart data={trendData} />
              </div>
            )}
            {/* DHU Trend with control limits */}
            {dhuTrendData.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
                <DHUTrendChart data={dhuTrendData} />
              </div>
            )}
            {/* Labor Productivity by Dept */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <LaborProductivityChart data={laborDeptData} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 3️⃣ BOTTOM SECTION — Advanced Charts        */}
      {/* ═══════════════════════════════════════════ */}
      {isDefault && (
        <div className="space-y-3">
          {/* Production Flow Panel */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-[13px] font-bold text-foreground">Production Flow Panel</h2>
          </div>

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

          {/* Quality Panel */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-1 h-4 rounded-full bg-success" />
            <h2 className="text-[13px] font-bold text-foreground">Quality Panel</h2>
          </div>

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

          {/* Workforce Panel */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-1 h-4 rounded-full bg-purple" />
            <h2 className="text-[13px] font-bold text-foreground">Workforce Panel</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <TurnoverColumnChart data={turnoverData} />
            </div>
            {/* Line Performance Table */}
            <div className="animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <LineStatusTable lines={lineStatuses.slice(0, 8)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
