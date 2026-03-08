import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  power_failure: 'Power',
  style_changeover: 'Style Change',
  quality_issue: 'QC Hold',
  material_shortage: 'Material',
  absenteeism: 'Absent',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  other: 'Other',
};

const COLORS = [
  'hsl(var(--chart-4))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

const chartConfig = {
  minutes: { label: 'Minutes' },
};

export function LostTimeDonutChart({ data }: LostTimeDonutChartProps) {
  const total = data.reduce((s, d) => s + d.minutes, 0);
  const chartData = data.slice(0, 7).map((d, i) => ({
    name: reasonLabels[d.reason] || d.reason,
    value: d.minutes,
    pct: total > 0 ? ((d.minutes / total) * 100).toFixed(1) : '0',
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-bold">Lost Time Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="h-[160px] w-[160px] shrink-0">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex-1 space-y-1.5 min-w-0">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.fill }} />
                <span className="text-foreground font-medium truncate flex-1">{d.name}</span>
                <span className="text-muted-foreground font-semibold shrink-0">{d.pct}%</span>
              </div>
            ))}
            <div className="pt-1 border-t border-border text-[10px] font-bold text-foreground">
              Total: {total} mins
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
