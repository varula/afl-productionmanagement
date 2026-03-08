import { TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  totalOutput: number;
  totalTarget: number;
  overallEfficiency: number;
  pcsShort: number;
  linesBelowTarget: number;
  currentHour: number;
  currentHourLabel: string;
}

export function HourlyKPICards({
  totalOutput, totalTarget, overallEfficiency, pcsShort, linesBelowTarget, currentHour, currentHourLabel,
}: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Output */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalOutput.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Total Output Today</p>
          </div>
        </div>
      </div>

      {/* Overall Efficiency */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{overallEfficiency.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">Overall Efficiency</p>
          </div>
        </div>
      </div>

      {/* Pcs Short of Target */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pcsShort.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Pcs Short of Target</p>
            {linesBelowTarget > 0 && (
              <p className="text-[10px] text-destructive">{linesBelowTarget} lines below 80%</p>
            )}
          </div>
        </div>
      </div>

      {/* Current Hour */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentHour}</p>
            <p className="text-[11px] text-muted-foreground">Current Hour</p>
            <p className="text-[10px] text-muted-foreground">{currentHourLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
