import { useMemo } from 'react';
import { KPIGrid } from '@/components/kpi/KPIGrid';
import { EfficiencyTrendChart } from '@/components/charts/EfficiencyTrendChart';
import { DowntimeParetoChart } from '@/components/charts/DowntimeParetoChart';
import { LineStatusTable, type LineStatus } from '@/components/dashboard/LineStatusTable';
import { computeAllKPIs, type KPIInput } from '@/lib/kpi';

// Demo data — will be replaced with Supabase queries
const demoInput: KPIInput = {
  totalOutput: 4250,
  totalTarget: 5000,
  totalManpower: 320,
  totalMachines: 280,
  totalWorkingMinutes: 480,
  totalDowntimeMinutes: 38,
  totalNptMinutes: 22,
  totalDefects: 85,
  totalChecked: 4250,
  totalRework: 32,
  weightedSmv: 12.5,
  plannedOperators: 330,
  presentOperators: 310,
  totalLaborCost: 2800,
  totalSamProduced: 53125,
  cutQty: 5200,
  shippedQty: 5050,
  orderedQty: 5200,
  onTimeOrders: 12,
  totalOrders: 13,
  separations: 4,
  avgHeadcount: 330,
};

const demoTrendData = [
  { date: 'Mar 01', efficiency: 52, target: 65 },
  { date: 'Mar 02', efficiency: 55, target: 65 },
  { date: 'Mar 03', efficiency: 58, target: 65 },
  { date: 'Mar 04', efficiency: 54, target: 65 },
  { date: 'Mar 05', efficiency: 61, target: 65 },
  { date: 'Mar 06', efficiency: 63, target: 65 },
  { date: 'Mar 07', efficiency: 59, target: 65 },
  { date: 'Mar 08', efficiency: 65, target: 65 },
];

const demoDowntimeData = [
  { reason: 'machine_breakdown', minutes: 95 },
  { reason: 'no_feeding', minutes: 72 },
  { reason: 'style_changeover', minutes: 55 },
  { reason: 'quality_issue', minutes: 40 },
  { reason: 'power_failure', minutes: 28 },
  { reason: 'material_shortage', minutes: 18 },
  { reason: 'absenteeism', minutes: 12 },
  { reason: 'maintenance', minutes: 8 },
];

const demoLines: LineStatus[] = [
  { lineNumber: 1, style: 'ST-2024-001', target: 450, output: 420, efficiency: 68.2, achievement: 93.3, dhu: 2.1, status: 'on_track' },
  { lineNumber: 2, style: 'ST-2024-003', target: 380, output: 355, efficiency: 62.5, achievement: 93.4, dhu: 3.5, status: 'on_track' },
  { lineNumber: 3, style: 'ST-2024-007', target: 500, output: 410, efficiency: 55.8, achievement: 82.0, dhu: 4.2, status: 'at_risk' },
  { lineNumber: 4, style: 'ST-2024-002', target: 420, output: 395, efficiency: 64.1, achievement: 94.0, dhu: 1.8, status: 'on_track' },
  { lineNumber: 5, style: 'ST-2024-009', target: 400, output: 280, efficiency: 42.3, achievement: 70.0, dhu: 6.5, status: 'behind' },
  { lineNumber: 6, style: 'ST-2024-004', target: 480, output: 440, efficiency: 66.7, achievement: 91.7, dhu: 2.8, status: 'on_track' },
  { lineNumber: 7, style: 'ST-2024-011', target: 350, output: 310, efficiency: 58.9, achievement: 88.6, dhu: 3.0, status: 'at_risk' },
  { lineNumber: 8, style: 'ST-2024-005', target: 520, output: 490, efficiency: 71.2, achievement: 94.2, dhu: 1.5, status: 'on_track' },
];

export default function Dashboard() {
  const kpis = useMemo(() => {
    const results = computeAllKPIs(demoInput);
    // Add sample trends
    return results.map((kpi, i) => ({
      ...kpi,
      trend: (['up', 'down', 'up', 'flat', 'up', 'up', 'up', 'up', 'down', 'down', 'down', 'flat'] as const)[i],
    }));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Factory Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time production KPIs — March 8, 2026</p>
      </div>

      <KPIGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EfficiencyTrendChart data={demoTrendData} />
        <DowntimeParetoChart data={demoDowntimeData} />
      </div>

      <LineStatusTable lines={demoLines} />
    </div>
  );
}
