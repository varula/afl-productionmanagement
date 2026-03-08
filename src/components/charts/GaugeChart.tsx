import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  status: 'success' | 'warning' | 'danger';
  description?: string;
}

export function GaugeChart({ label, value, target, unit = '%', status, description }: GaugeChartProps) {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 120);
  const angle = (pct / 120) * 180; // Map to 180 degree arc
  const statusColor = status === 'success' ? 'hsl(var(--success))' : status === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--pink))';
  const statusBg = status === 'success' ? 'bg-success/10 text-success' : status === 'warning' ? 'bg-warning/10 text-warning' : 'bg-pink/10 text-pink';

  // SVG arc path
  const radius = 52;
  const cx = 60;
  const cy = 60;
  const startAngle = -180;
  const endAngle = startAngle + angle;

  const polarToCartesian = (a: number) => ({
    x: cx + radius * Math.cos((a * Math.PI) / 180),
    y: cy + radius * Math.sin((a * Math.PI) / 180),
  });

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = angle > 180 ? 1 : 0;

  const arcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  const bgPath = `M ${polarToCartesian(-180).x} ${polarToCartesian(-180).y} A ${radius} ${radius} 0 1 1 ${polarToCartesian(0).x} ${polarToCartesian(0).y}`;

  return (
    <Card className="border-[1.5px] hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 px-4 flex flex-col items-center">
        <svg viewBox="0 0 120 70" className="w-full max-w-[140px] h-auto">
          {/* Background arc */}
          <path d={bgPath} fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
          {/* Value arc */}
          {value > 0 && (
            <path d={arcPath} fill="none" stroke={statusColor} strokeWidth="8" strokeLinecap="round" />
          )}
          {/* Center value */}
          <text x="60" y="58" textAnchor="middle" className="fill-foreground" fontSize="16" fontWeight="800">
            {value.toFixed(1)}
          </text>
          <text x="60" y="68" textAnchor="middle" className="fill-muted-foreground" fontSize="7">
            {unit}
          </text>
        </svg>
        <div className="text-center mt-1">
          <div className="text-[11px] font-bold text-foreground">{label}</div>
          <div className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5', statusBg)}>
            Target: {target}{unit}
          </div>
          {description && <div className="text-[9px] text-muted-foreground mt-0.5">{description}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
