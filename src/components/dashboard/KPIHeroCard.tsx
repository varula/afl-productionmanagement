import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface KPIHeroCardProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  status: 'success' | 'warning' | 'danger';
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
}

const statusColors = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-pink',
};

const statusBg = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-pink',
};

export function KPIHeroCard({ label, value, target, unit = '%', status, trend = 'flat' }: KPIHeroCardProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-3xl font-bold leading-none tracking-tight text-foreground">
          {value >= 100 ? Math.round(value) : value.toFixed(1)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        <TrendIcon className={cn('h-4 w-4 ml-auto', statusColors[status])} />
      </div>

      {/* Target label */}
      <div className="text-xs text-muted-foreground mb-3">
        Target: {target}{unit}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', statusBg[status])}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-end mt-2">
        <span className={cn('text-xs font-semibold', statusColors[status])}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
