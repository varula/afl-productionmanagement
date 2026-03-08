import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIResult } from '@/lib/kpi';

const iconColors = [
  'bg-success/10 text-success',
  'bg-primary/10 text-primary',
  'bg-accent/10 text-accent',
  'bg-purple/10 text-purple',
  'bg-warning/10 text-warning',
  'bg-pink/10 text-pink',
];

interface KPICardProps {
  kpi: KPIResult;
  index?: number;
}

export function KPICard({ kpi, index = 0 }: KPICardProps) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
  const trendColor = kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-pink' : 'text-muted-foreground';
  const colorClass = iconColors[index % iconColors.length];

  return (
    <div className="rounded-xl border-[1.5px] border-border bg-card p-3 flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-pop-in">
      <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', colorClass)}>
        <TrendIcon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[17px] font-extrabold text-foreground tracking-tight leading-tight">
          {kpi.value}<span className="text-xs font-semibold text-muted-foreground ml-0.5">{kpi.unit}</span>
        </div>
        <div className="text-[10.5px] text-muted-foreground font-medium mt-0.5 truncate">{kpi.label}</div>
        {kpi.target !== undefined && (
          <div className={cn('text-[10px] font-semibold mt-0.5', trendColor)}>
            Target: {kpi.target}{kpi.unit}
          </div>
        )}
      </div>
    </div>
  );
}
