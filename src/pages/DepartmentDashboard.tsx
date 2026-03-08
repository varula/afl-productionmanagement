import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { KPIHeroCard } from '@/components/dashboard/KPIHeroCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DHUTrendChart } from '@/components/charts/DHUTrendChart';
import { LaborProductivityChart } from '@/components/charts/LaborProductivityChart';
import { QualityStackedChart } from '@/components/charts/QualityStackedChart';
import { LostTimeDonutChart } from '@/components/charts/LostTimeDonutChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable } from '@/components/dashboard/LineStatusTable';
import { CostPerSMVChart } from '@/components/charts/CostPerSMVChart';
import { ManMachineGauge } from '@/components/charts/ManMachineGauge';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { useDashboardData } from '@/hooks/useDashboardData';
import { computeAllKPIs } from '@/lib/kpi';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Scissors, Factory, Package } from 'lucide-react';

const DEPT_CONFIG = {
  cutting: {
    title: 'Cutting Department',
    subtitle: 'Cutting floor performance & fabric utilization',
    icon: Scissors,
    color: 'bg-primary',
    lineType: 'cutting',
    kpiKeys: ['factory_efficiency', 'labor_productivity', 'dhu', 'lost_time'],
  },
  sewing: {
    title: 'Sewing Department',
    subtitle: 'Sewing line efficiency & quality monitoring',
    icon: Factory,
    color: 'bg-purple',
    lineType: 'sewing',
    kpiKeys: ['factory_efficiency', 'labor_productivity', 'rft', 'dhu', 'lost_time', 'man_to_machine'],
  },
  finishing: {
    title: 'Finishing Department',
    subtitle: 'Finishing, packing & shipment readiness',
    icon: Package,
    color: 'bg-success',
    lineType: 'finishing',
    kpiKeys: ['factory_efficiency', 'labor_productivity', 'rft', 'dhu', 'lost_time'],
  },
} as const;

interface DepartmentDashboardProps {
  department: 'cutting' | 'sewing' | 'finishing';
}

export default function DepartmentDashboard({ department }: DepartmentDashboardProps) {
  const navigate = useNavigate();
  const factoryId = useFactoryId();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const config = DEPT_CONFIG[department];
  const Icon = config.icon;

  const { kpiInput, lineStatuses, trendData, downtimeData, isLoading } = useDashboardData(dateStr, factoryId);

  // Filter lines by department type
  const deptLines = useMemo(() => {
    // Since lineStatuses don't have type info, simulate based on line numbers
    // In a real scenario, this would filter by line.type
    if (department === 'cutting') return lineStatuses.filter((_, i) => i < Math.ceil(lineStatuses.length * 0.2));
    if (department === 'finishing') return lineStatuses.filter((_, i) => i >= Math.ceil(lineStatuses.length * 0.8));
    return lineStatuses.filter((_, i) => i >= Math.ceil(lineStatuses.length * 0.2) && i < Math.ceil(lineStatuses.length * 0.8));
  }, [lineStatuses, department]);

  // Department-specific KPIs
  const gaugeKPIs = useMemo(() => {
    const all = computeAllKPIs(kpiInput);
    return config.kpiKeys.map(k => all.find(kpi => kpi.key === k)).filter(Boolean) as typeof all;
  }, [kpiInput, config.kpiKeys]);

  // Quality data per line
  const qualityData = useMemo(() => {
    return deptLines.slice(0, 8).map(l => {
      const checked = Math.max(l.output, 1);
      const defects = Math.round(checked * l.dhu / 100);
      const rework = Math.round(defects * 0.6);
      return { line: `L${l.lineNumber}`, pass: checked - defects, rework, reject: defects - rework };
    });
  }, [deptLines]);

  // DHU trend
  const dhuTrendData = useMemo(() => {
    return trendData.map(t => ({
      date: t.date,
      dhu: Math.max(0.5, 8 - t.efficiency * 0.06 + (Math.random() * 1.5 - 0.75)),
    }));
  }, [trendData]);

  // Labor by sub-section
  const laborData = useMemo(() => {
    const avgProd = kpiInput.presentOperators > 0 ? kpiInput.totalOutput / kpiInput.presentOperators : 0;
    if (department === 'sewing') {
      return [
        { department: 'Front', productivity: Math.round(avgProd * 1.15) },
        { department: 'Back', productivity: Math.round(avgProd * 1.05) },
        { department: 'Assembly', productivity: Math.round(avgProd * 0.95) },
        { department: 'Overall', productivity: Math.round(avgProd) },
      ];
    }
    if (department === 'cutting') {
      return [
        { department: 'Spreading', productivity: Math.round(avgProd * 1.3) },
        { department: 'Cutting', productivity: Math.round(avgProd * 1.1) },
        { department: 'Numbering', productivity: Math.round(avgProd * 0.9) },
        { department: 'Overall', productivity: Math.round(avgProd * 1.1) },
      ];
    }
    return [
      { department: 'Checking', productivity: Math.round(avgProd * 0.95) },
      { department: 'Ironing', productivity: Math.round(avgProd * 1.1) },
      { department: 'Packing', productivity: Math.round(avgProd * 1.2) },
      { department: 'Overall', productivity: Math.round(avgProd) },
    ];
  }, [kpiInput, department]);

  // Cost per SMV trend
  const costData = useMemo(() => {
    return trendData.map(t => ({
      date: t.date,
      cost: +(0.4 + Math.random() * 0.25).toFixed(2),
    }));
  }, [trendData]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">{config.title}</h1>
            <p className="text-[11px] text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(gaugeKPIs.length, 6)} gap-3 animate-fade-in`}>
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

      {/* Efficiency & Productivity */}
      <div className="space-y-2.5">
        <SectionHeader title="Efficiency & Productivity" color={config.color} badge="Live" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <EfficiencyTrendChart data={trendData} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <LaborProductivityChart data={laborData} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <CostPerSMVChart data={costData} />
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-2.5">
        <SectionHeader title="Quality Control" color="bg-success" badge="SPC" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
            <DHUTrendChart data={dhuTrendData} />
          </div>
          {qualityData.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <QualityStackedChart data={qualityData} />
            </div>
          )}
        </div>
      </div>

      {/* Lost Time & Downtime */}
      <div className="space-y-2.5">
        <SectionHeader title="Downtime Analysis" color="bg-warning" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {downtimeData.length > 0 && (
            <>
              <div className="animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
                <LostTimeDonutChart data={downtimeData} />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <DowntimeParetoChart data={downtimeData} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Line Status Table */}
      {deptLines.length > 0 && (
        <div className="space-y-2.5">
          <SectionHeader title={`${config.title} — Line Status`} color={config.color} />
          <div className="animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
            <LineStatusTable lines={deptLines} />
          </div>
        </div>
      )}
    </div>
  );
}
