import { useMemo } from 'react';
import { KPIGrid } from '@/components/kpi/KPIGrid';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable, type LineStatus } from '@/components/dashboard/LineStatusTable';
import { computeAllKPIs, type KPIInput } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function Dashboard() {
  const kpis = useMemo(() => {
    const results = computeAllKPIs(demoInput);
    return results.map((kpi, i) => ({
      ...kpi,
      trend: (['up', 'down', 'up', 'flat', 'up', 'up', 'up', 'up', 'down', 'down', 'down', 'flat'] as const)[i],
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topStats.map((stat, i) => {
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
        <DowntimeParetoChart data={demoDowntimeData} />
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
      <LineStatusTable lines={demoLines} />
    </div>
  );
}
