import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FunnelStage {
  stage: string;
  qty: number;
  color: string;
}

interface ProductionFunnelChartProps {
  stages: FunnelStage[];
}

export function ProductionFunnelChart({ stages }: ProductionFunnelChartProps) {
  const maxQty = Math.max(...stages.map(s => s.qty), 1);

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-bold">Production Flow — Cut → Ship</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.qty / maxQty) * 100, 15);
          const lossPct = i > 0 ? ((stages[i - 1].qty - stage.qty) / stages[i - 1].qty * 100) : 0;
          return (
            <div key={stage.stage} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">{stage.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-foreground">{stage.qty.toLocaleString()} pcs</span>
                  {i > 0 && lossPct > 0 && (
                    <span className="text-[9px] font-semibold text-pink">-{lossPct.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className={cn('h-full rounded-lg transition-all duration-700', stage.color)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              {i < stages.length - 1 && (
                <div className="flex justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground">
                    <path d="M6 2 L6 10 M3 7 L6 10 L9 7" stroke="currentColor" fill="none" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
