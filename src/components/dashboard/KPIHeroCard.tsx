import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export function KPIHeroCard({ label, value, target, unit = '%', status, trend = 'flat' }: KPIHeroCardProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 transition-all hover:shadow-md">
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">{label}</span>
        <TrendIcon className={cn('h-3.5 w-3.5', statusColors[status])} />
      </div>

      {/* Big value */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className={cn('text-[32px] font-bold leading-none tracking-tight text-foreground')}>
          {value >= 100 ? Math.round(value) : value.toFixed(1)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
      </div>

      {/* Progress bar — thin, Apple-style */}
      <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out',
            status === 'success' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-pink'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Target */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Target {target}{unit}</span>
        <span className={cn('text-[10px] font-semibold', statusColors[status])}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
