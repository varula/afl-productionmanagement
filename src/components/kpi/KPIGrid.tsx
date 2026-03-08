import { KPICard } from './KPICard';
import type { KPIResult } from '@/lib/kpi';

interface KPIGridProps {
  kpis: KPIResult[];
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.key} kpi={kpi} index={i} />
      ))}
    </div>
  );
}
