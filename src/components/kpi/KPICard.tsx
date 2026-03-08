import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIResult } from '@/lib/kpi';

const statusColors = {
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-destructive',
};

const statusBg = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
};

interface KPICardProps {
  kpi: KPIResult;
}

export function KPICard({ kpi }: KPICardProps) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn('transition-shadow hover:shadow-md', statusColors[kpi.status])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
            {kpi.label}
          </p>
          {kpi.trend && (
            <div className={cn('rounded-full p-1', statusBg[kpi.status])}>
              <TrendIcon className="h-3 w-3" />
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold text-card-foreground">
            {kpi.value}
          </span>
          <span className="text-sm text-muted-foreground">{kpi.unit}</span>
        </div>
        {kpi.target !== undefined && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  kpi.status === 'success' ? 'bg-success' : kpi.status === 'warning' ? 'bg-warning' : 'bg-destructive'
                )}
                style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              Target: {kpi.target}{kpi.unit}
            </span>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{kpi.description}</p>
      </CardContent>
    </Card>
  );
}
