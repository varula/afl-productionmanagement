import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface LostTimeData {
  reason: string;
  minutes: number;
}

interface LostTimeDonutChartProps {
  data: LostTimeData[];
}

const reasonLabels: Record<string, string> = {
  machine_breakdown: 'Machine BD',
  no_feeding: 'No Input',
  power_failure: 'Power Cut',
  style_changeover: 'Style Change',
  quality_issue: 'QC Hold',
  material_shortage: 'Material',
  absenteeism: 'Absent',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  other: 'Other',
};

const COLORS = [
  'hsl(var(--pink))',
  'hsl(var(--warning))',
  'hsl(var(--primary))',
  'hsl(var(--purple))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--muted-foreground))',
];

const chartConfig = {
  minutes: { label: 'Minutes' },
};

export function LostTimeDonutChart({ data }: LostTimeDonutChartProps) {
  const total = data.reduce((s, d) => s + d.minutes, 0);
  const chartData = data.slice(0, 6).map((d, i) => ({
    name: reasonLabels[d.reason] || d.reason,
    value: d.minutes,
    pct: total > 0 ? ((d.minutes / total) * 100).toFixed(1) : '0',
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="mb-3">
          <div className="text-[13px] font-bold text-foreground">Lost Time Breakdown</div>
          <div className="text-[10px] text-muted-foreground">Downtime + NPT distribution</div>
        </div>
        <div className="flex items-start gap-4">
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[160px] w-[160px] shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Center total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[18px] font-black text-foreground leading-none">{total}</span>
              <span className="text-[8px] font-medium text-muted-foreground">mins</span>
            </div>
          </div>
          <div className="flex-1 space-y-2 min-w-0 pt-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: d.fill }} />
                <span className="text-[10px] text-foreground font-medium truncate flex-1">{d.name}</span>
                <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
