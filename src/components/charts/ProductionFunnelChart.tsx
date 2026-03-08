import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="mb-4">
          <div className="text-[13px] font-bold text-foreground leading-tight">Production Flow</div>
          <div className="text-[10px] text-muted-foreground">Cut → Sew → Finish → Ship conversion</div>
        </div>
        <div className="flex-1 space-y-3">
          {stages.map((stage, i) => {
            const widthPct = Math.max((stage.qty / maxQty) * 100, 20);
            const lossPct = i > 0 ? ((stages[i - 1].qty - stage.qty) / stages[i - 1].qty * 100) : 0;
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                    <span className="text-[11px] font-semibold text-foreground">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-foreground tabular-nums">
                      {stage.qty.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-muted-foreground">pcs</span>
                    {i > 0 && lossPct > 0 && (
                      <span className="text-[8px] font-bold text-pink bg-pink/8 px-1.5 py-0.5 rounded-md">
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
                  <div className="flex justify-center my-1">
                    <div className="w-px h-3 bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">Overall Yield</span>
          <span className="text-[12px] font-black text-foreground">
            {stages.length >= 2 ? ((stages[stages.length - 1].qty / stages[0].qty) * 100).toFixed(1) : 100}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
