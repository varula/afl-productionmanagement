import { useMemo } from 'react';
import { KPIGrid } from '@/components/kpi/KPIGrid';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable, type LineStatus } from '@/components/dashboard/LineStatusTable';
import { computeAllKPIs, type KPIInput } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveFilter } from '@/hooks/useActiveFilter';

// Demo data — will be replaced with Supabase queries
const demoInput: KPIInput = {
  totalOutput: 48620,
  totalTarget: 52000,
  totalManpower: 1824,
  totalMachines: 648,
  totalWorkingMinutes: 480,
  totalDowntimeMinutes: 184,
  totalNptMinutes: 45,
  totalDefects: 1068,
  totalChecked: 48620,
  totalRework: 420,
  weightedSmv: 12.5,
  plannedOperators: 1900,
  presentOperators: 1824,
  totalLaborCost: 28000,
  totalSamProduced: 607750,
  cutQty: 52000,
  shippedQty: 48400,
  orderedQty: 52000,
  onTimeOrders: 58,
  totalOrders: 62,
  separations: 12,
  avgHeadcount: 1900,
};

const demoTrendData = [
  { date: 'Mar 01', efficiency: 88, target: 92 },
  { date: 'Mar 02', efficiency: 89, target: 92 },
  { date: 'Mar 03', efficiency: 91, target: 92 },
  { date: 'Mar 04', efficiency: 87, target: 92 },
  { date: 'Mar 05', efficiency: 90, target: 92 },
  { date: 'Mar 06', efficiency: 91, target: 92 },
  { date: 'Mar 07', efficiency: 89, target: 92 },
  { date: 'Mar 08', efficiency: 93, target: 92 },
];

const demoDowntimeData = [
  { reason: 'machine_breakdown', minutes: 778 },
  { reason: 'no_feeding', minutes: 518 },
  { reason: 'quality_issue', minutes: 333 },
  { reason: 'power_failure', minutes: 92 },
  { reason: 'style_changeover', minutes: 74 },
  { reason: 'maintenance', minutes: 55 },
];

const demoLines: LineStatus[] = [
  { lineNumber: 1, style: 'Gap Fleece Hoodie', target: 4500, output: 4280, efficiency: 96, achievement: 95.1, dhu: 1.6, status: 'on_track' },
  { lineNumber: 2, style: 'Cubus Cardigan', target: 4000, output: 3640, efficiency: 91, achievement: 91.0, dhu: 2.1, status: 'on_track' },
  { lineNumber: 3, style: 'Cubus Cardigan', target: 4000, output: 3560, efficiency: 89, achievement: 89.0, dhu: 3.2, status: 'at_risk' },
  { lineNumber: 4, style: 'Gap Fleece Hoodie', target: 4000, output: 3760, efficiency: 94, achievement: 94.0, dhu: 1.5, status: 'on_track' },
  { lineNumber: 5, style: 'Lager 157 Blouse', target: 4000, output: 3720, efficiency: 93, achievement: 93.0, dhu: 2.0, status: 'on_track' },
  { lineNumber: 6, style: 'Lager 157 Blouse', target: 4000, output: 3520, efficiency: 88, achievement: 88.0, dhu: 2.8, status: 'at_risk' },
  { lineNumber: 7, style: 'Lager 157 Blouse', target: 4000, output: 3680, efficiency: 92, achievement: 92.0, dhu: 2.2, status: 'on_track' },
  { lineNumber: 8, style: 'ZXY Sport Legging', target: 4000, output: 2960, efficiency: 74, achievement: 74.0, dhu: 6.5, status: 'behind' },
  { lineNumber: 9, style: 'UCB Polo Shirt', target: 4000, output: 3680, efficiency: 92, achievement: 92.0, dhu: 1.9, status: 'on_track' },
  { lineNumber: 10, style: 'Gap Chino Trouser', target: 4000, output: 3400, efficiency: 85, achievement: 85.0, dhu: 3.8, status: 'at_risk' },
  { lineNumber: 11, style: 'Gap Chino Trouser', target: 4000, output: 3600, efficiency: 90, achievement: 90.0, dhu: 2.0, status: 'on_track' },
  { lineNumber: 12, style: 'UCB Polo Shirt', target: 4000, output: 3520, efficiency: 88, achievement: 88.0, dhu: 2.5, status: 'at_risk' },
];

// Map sidebar keys to report titles and filtered content
const REPORT_CONFIG: Record<string, { title: string; subtitle: string }> = {
  'dash-default': { title: 'Production Summary', subtitle: 'Factory-wide overview for today' },
  'dash-output': { title: 'Daily Output Report', subtitle: 'Detailed output breakdown by line' },
  'dash-orderstatus': { title: 'Order Status Overview', subtitle: '62 active orders across 5 buyers' },
  'dash-shipments': { title: 'Shipment Tracker', subtitle: '4 shipments due this week' },
  'dash-delays': { title: 'Delay Analysis', subtitle: '4 delayed orders requiring attention' },
  'dash-lineeff': { title: 'Line Efficiency', subtitle: 'Efficiency ranking across all 12 sewing lines' },
  'dash-attendance': { title: 'Attendance Log', subtitle: '1,824 present / 1,900 planned (96.0%)' },
  'dash-machines': { title: 'Machine Status', subtitle: '643 running · 5 down · 0 idle' },
  'dash-qcsummary': { title: 'QC Summary', subtitle: 'DHU 2.2% · Pass Rate 97.8%' },
  'dash-buyers': { title: 'Buyer Performance', subtitle: 'On-time delivery by buyer' },
  'dash-inventory': { title: 'Inventory Snapshot', subtitle: '9 items at critical stock level' },
  'dash-period': { title: 'Period Comparison', subtitle: 'This week vs last week performance' },
};

// Top-level stats from attachment
const topStats = [
  { label: 'On-Time Delivery (OTD)', value: '93.8%', trend: '↑ 1.1% vs Feb · Target 97%', up: true, color: 'success' as const },
  { label: 'Active Orders', value: '62', trend: '↑ 7 vs last month', up: true, color: 'primary' as const },
  { label: 'Units Produced Today', value: '48,620', trend: '↑ 3.8% vs yesterday', up: true, color: 'accent' as const },
  { label: 'Delayed Shipments', value: '4', trend: '↑ 1 vs last week', up: false, color: 'pink' as const },
  { label: 'QC Pass Rate', value: '97.8%', trend: '↑ 0.3% vs target', up: true, color: 'success' as const },
  { label: 'Workers Present', value: '1,824', trend: '96.0% attendance', up: true, color: 'purple' as const },
  { label: 'Machines Down', value: '5', trend: '2 critical', up: false, color: 'warning' as const },
  { label: 'Overall Line Efficiency', value: '91.4%', trend: '↑ 1.2% vs Mon', up: true, color: 'success' as const },
];

const colorMap = {
  success: { bg: 'bg-success/10', icon: 'text-success', border: 'border-success/20' },
  primary: { bg: 'bg-primary/10', icon: 'text-primary', border: 'border-primary/20' },
  accent: { bg: 'bg-accent/10', icon: 'text-accent', border: 'border-accent/20' },
  pink: { bg: 'bg-pink/10', icon: 'text-pink', border: 'border-pink/20' },
  purple: { bg: 'bg-purple/10', icon: 'text-purple', border: 'border-purple/20' },
  warning: { bg: 'bg-warning/10', icon: 'text-warning', border: 'border-warning/20' },
};

// Filtered demo data per report type
function getFilteredLines(filter: string): LineStatus[] {
  switch (filter) {
    case 'dash-lineeff':
      return [...demoLines].sort((a, b) => b.efficiency - a.efficiency);
    case 'dash-delays':
      return demoLines.filter(l => l.status === 'behind' || l.status === 'at_risk');
    case 'dash-qcsummary':
      return [...demoLines].sort((a, b) => b.dhu - a.dhu);
    case 'dash-output':
      return [...demoLines].sort((a, b) => b.output - a.output);
    case 'dash-shipments':
      return demoLines.filter(l => l.status === 'on_track');
    case 'dash-buyers':
      return demoLines.filter(l => l.style.includes('Gap') || l.style.includes('Lager'));
    case 'dash-machines':
      return demoLines.filter(l => l.status !== 'on_track');
    case 'dash-attendance':
      return demoLines.filter(l => l.lineNumber <= 8);
    default:
      return demoLines;
  }
}

function getFilteredDowntime(filter: string) {
  if (filter === 'dash-machines') {
    return demoDowntimeData.filter(d => d.reason === 'machine_breakdown' || d.reason === 'maintenance');
  }
  if (filter === 'dash-qcsummary') {
    return demoDowntimeData.filter(d => d.reason === 'quality_issue');
  }
  if (filter === 'dash-delays') {
    return demoDowntimeData.filter(d => d.reason === 'machine_breakdown' || d.reason === 'no_feeding' || d.reason === 'power_failure');
  }
  return demoDowntimeData;
}

function getFilteredTrend(filter: string) {
  if (filter === 'dash-delays') {
    return demoTrendData.map(d => ({ ...d, efficiency: Math.max(70, d.efficiency - 4) }));
  }
  if (filter === 'dash-lineeff') {
    return demoTrendData.map(d => ({ ...d, efficiency: Math.min(99, d.efficiency + 2) }));
  }
  if (filter === 'dash-machines') {
    return demoTrendData.map(d => ({ ...d, efficiency: Math.max(70, d.efficiency - 3) }));
  }
  return demoTrendData;
}

function getFilterAdjustedInput(filter: string): KPIInput {
  const base = { ...demoInput };

  switch (filter) {
    case 'dash-delays':
      return {
        ...base,
        totalOutput: Math.round(base.totalOutput * 0.92),
        totalDowntimeMinutes: Math.round(base.totalDowntimeMinutes * 1.35),
        totalNptMinutes: Math.round(base.totalNptMinutes * 1.2),
        totalDefects: Math.round(base.totalDefects * 1.15),
      };
    case 'dash-lineeff':
      return {
        ...base,
        totalOutput: Math.round(base.totalOutput * 1.05),
        totalDowntimeMinutes: Math.round(base.totalDowntimeMinutes * 0.8),
        totalDefects: Math.round(base.totalDefects * 0.9),
      };
    case 'dash-attendance':
      return {
        ...base,
        presentOperators: 1760,
        totalManpower: 1760,
      };
    case 'dash-machines':
      return {
        ...base,
        totalOutput: Math.round(base.totalOutput * 0.95),
        totalDowntimeMinutes: Math.round(base.totalDowntimeMinutes * 1.6),
        totalNptMinutes: Math.round(base.totalNptMinutes * 1.3),
      };
    case 'dash-qcsummary':
      return {
        ...base,
        totalDefects: Math.round(base.totalDefects * 1.25),
        totalRework: Math.round(base.totalRework * 1.2),
      };
    case 'dash-inventory':
      return {
        ...base,
        totalOutput: Math.round(base.totalOutput * 0.94),
        cutQty: Math.round(base.cutQty * 0.9),
        shippedQty: Math.round(base.shippedQty * 0.92),
      };
    case 'dash-shipments':
      return {
        ...base,
        shippedQty: Math.round(base.shippedQty * 0.95),
        onTimeOrders: 52,
      };
    default:
      return base;
  }
}

function getFilteredTopStats(filter: string) {
  switch (filter) {
    case 'dash-orderstatus':
      return topStats.filter(s => s.label.includes('Order') || s.label.includes('Delivery') || s.label.includes('Shipment'));
    case 'dash-shipments':
      return topStats.filter(s => s.label.includes('Shipment') || s.label.includes('Delivery') || s.label.includes('Active Orders'));
    case 'dash-delays':
      return topStats.filter(s => s.label.includes('Delayed') || s.label.includes('Efficiency') || s.label.includes('Units Produced'));
    case 'dash-lineeff':
      return topStats.filter(s => s.label.includes('Line Efficiency') || s.label.includes('Units Produced'));
    case 'dash-attendance':
      return topStats.filter(s => s.label.includes('Workers Present'));
    case 'dash-machines':
      return topStats.filter(s => s.label.includes('Machines Down'));
    case 'dash-qcsummary':
      return topStats.filter(s => s.label.includes('QC Pass'));
    case 'dash-buyers':
      return topStats.filter(s => s.label.includes('On-Time Delivery') || s.label.includes('Active Orders') || s.label.includes('Units Produced'));
    case 'dash-inventory':
      return topStats.filter(s => s.label.includes('Units Produced') || s.label.includes('Delayed Shipments'));
    default:
      return topStats;
  }
}

export default function Dashboard() {
  const activeFilter = useActiveFilter();
  const currentFilter = activeFilter || 'dash-default';
  const reportConfig = REPORT_CONFIG[currentFilter] || REPORT_CONFIG['dash-default'];

  const filteredLines = useMemo(() => getFilteredLines(currentFilter), [currentFilter]);
  const filteredDowntime = useMemo(() => getFilteredDowntime(currentFilter), [currentFilter]);
  const filteredTrend = useMemo(() => getFilteredTrend(currentFilter), [currentFilter]);
  const filteredTopStats = useMemo(() => getFilteredTopStats(currentFilter), [currentFilter]);
  const filteredInput = useMemo(() => getFilterAdjustedInput(currentFilter), [currentFilter]);

  const kpis = useMemo(() => {
    const results = computeAllKPIs(filteredInput);
    return results.map((kpi, i) => ({
      ...kpi,
      trend: (['up', 'down', 'up', 'flat', 'up', 'up', 'up', 'up', 'down', 'down', 'down', 'flat'] as const)[i],
    }));
  }, [filteredInput]);

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
        <EfficiencyTrendChart data={demoTrendData} />
        <DowntimeParetoChart data={filteredDowntime} />
      </div>

      {/* Production Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold">Production Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { stage: 'Cutting (CF-01)', qty: '142,400 pcs', color: 'bg-primary' },
              { stage: 'Sewing (12 Lines)', qty: '318,200 pcs', color: 'bg-purple' },
              { stage: 'QC Inline', qty: '48,600 pcs', color: 'bg-warning' },
              { stage: 'Finishing (4 Lines)', qty: '96,400 pcs', color: 'bg-success' },
              { stage: 'Auxiliary (Bartack/Eyelet)', qty: '18,000 pcs', color: 'bg-accent' },
              { stage: 'Final QC', qty: '22,100 pcs', color: 'bg-accent' },
              { stage: 'Packing & Dispatch', qty: '18,800 pcs', color: 'bg-pink' },
            ].map(item => (
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
