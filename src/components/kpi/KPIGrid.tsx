import { KPICard } from './KPICard';
import type { KPIResult } from '@/lib/kpi';

interface KPIGridProps {
  kpis: KPIResult[];
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}
