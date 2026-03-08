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

const statusStyles = {
  success: {
    ring: 'ring-success/20',
    glow: 'shadow-[0_0_20px_-4px_hsl(var(--success)/0.3)]',
    accent: 'text-success',
    bg: 'bg-success/8',
    bar: 'bg-success',
    badge: 'bg-success/12 text-success border-success/25',
  },
  warning: {
    ring: 'ring-warning/20',
    glow: 'shadow-[0_0_20px_-4px_hsl(var(--warning)/0.3)]',
    accent: 'text-warning',
    bg: 'bg-warning/8',
    bar: 'bg-warning',
    badge: 'bg-warning/12 text-warning border-warning/25',
  },
  danger: {
    ring: 'ring-pink/20',
    glow: 'shadow-[0_0_20px_-4px_hsl(var(--pink)/0.3)]',
    accent: 'text-pink',
    bg: 'bg-pink/8',
    bar: 'bg-pink',
    badge: 'bg-pink/12 text-pink border-pink/25',
  },
};

export function KPIHeroCard({ label, value, target, unit = '%', status, trend = 'flat', icon }: KPIHeroCardProps) {
  const s = statusStyles[status];
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn(
      'group relative rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300',
      'hover:border-border hover:-translate-y-1',
      s.glow,
      'ring-1',
      s.ring,
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn('absolute inset-0 rounded-2xl opacity-[0.03]', s.bar)} />
      
      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={cn('flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border', s.badge)}>
            <TrendIcon className="h-2.5 w-2.5" />
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
          </div>
        </div>

        {/* Big value */}
        <div className="flex items-baseline gap-1 mb-2.5">
          <span className={cn('text-[28px] font-black leading-none tracking-tight', s.accent)}>
            {value.toFixed(value >= 100 ? 0 : 1)}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">{unit}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-out', s.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Target label */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">Target: {target}{unit}</span>
          <span className={cn('text-[9px] font-bold', pct >= 90 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-pink')}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
