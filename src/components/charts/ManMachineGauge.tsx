import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ManMachineGaugeProps {
  ratio: number;
  target: number;
  operators: number;
  machines: number;
}

export function ManMachineGauge({ ratio, target, operators, machines }: ManMachineGaugeProps) {
  const maxRatio = 4;
  const angle = Math.min((ratio / maxRatio) * 180, 180);
  const targetAngle = Math.min((target / maxRatio) * 180, 180);

  const status = ratio <= target * 1.1 ? 'success' : ratio <= target * 1.3 ? 'warning' : 'danger';
  const statusColor = status === 'success' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-pink';

  const cx = 100, cy = 90, r = 70;
  const toRad = (deg: number) => ((deg - 180) * Math.PI) / 180;
  const endAngle = toRad(angle);
  const targetEnd = toRad(targetAngle);

  const arcEnd = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const targetPos = { x: cx + r * Math.cos(targetEnd), y: cy + r * Math.sin(targetEnd) };
  const arcStart = { x: cx - r, y: cy };

  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground leading-tight">Man : Machine Ratio</div>
            <div className="text-[10px] text-muted-foreground">Workforce to equipment balance</div>
          </div>
          <span className={cn('text-[8px] font-semibold px-1.5 py-0.5 rounded border shrink-0',
            status === 'success' ? 'bg-success/10 text-success border-success/20' :
            status === 'warning' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-pink/10 text-pink border-pink/20'
          )}>
            Target {target.toFixed(1)}:1
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <svg viewBox="0 0 200 105" className="w-full max-w-[200px]">
            <path d={bgPath} fill="none" stroke="hsl(var(--border))" strokeWidth="12" strokeLinecap="round" />
            <path d={arcPath} fill="none" stroke={`hsl(var(--${status === 'danger' ? 'pink' : status}))`} strokeWidth="12" strokeLinecap="round" />
            <circle cx={targetPos.x} cy={targetPos.y} r="4" fill="hsl(var(--foreground))" />
            <text x={targetPos.x} y={targetPos.y - 10} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Target</text>
            <text x={cx} y={cy - 8} textAnchor="middle" className={statusColor} fontSize="24" fontWeight="800" fill="currentColor">
              {ratio.toFixed(1)}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">: 1</text>
          </svg>
          <div className="flex items-center justify-center gap-6 mt-2 text-[10px] text-muted-foreground">
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">{operators}</div>
              <div>Operators</div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">{machines}</div>
              <div>Machines</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
