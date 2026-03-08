import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

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
    <Card className="border border-border/60 shadow-none hover:shadow-md transition-shadow h-full rounded-2xl">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-base font-semibold text-foreground leading-tight">Production Flow</div>
            <div className="text-xs text-muted-foreground mt-0.5">Cut → Sew → Finish → Ship conversion</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* Funnel bars */}
        <div className="flex-1 space-y-4">
          {stages.map((stage, i) => {
            const widthPct = Math.max((stage.qty / maxQty) * 100, 20);
            const lossPct = i > 0 ? ((stages[i - 1].qty - stage.qty) / stages[i - 1].qty * 100) : 0;
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', stage.color)} />
                    <span className="text-sm font-semibold text-foreground">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {stage.qty.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">pcs</span>
                    {i > 0 && lossPct > 0 && (
                      <span className="text-xs font-semibold text-pink bg-pink/10 px-1.5 py-0.5 rounded-md">
                        -{lossPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-1000 ease-out', stage.color)}
                    style={{ width: `${widthPct}%`, opacity: 0.75 }}
                  />
                </div>
                {i < stages.length - 1 && (
                  <div className="flex justify-center my-1.5">
                    <div className="w-px h-3 bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Overall Yield</span>
          <span className="text-sm font-bold text-foreground">
            {stages.length >= 2 ? ((stages[stages.length - 1].qty / stages[0].qty) * 100).toFixed(1) : 100}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
