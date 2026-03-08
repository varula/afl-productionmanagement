import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface TrendData {
  date: string;
  efficiency: number;
  target: number;
}

interface EfficiencyTrendChartProps {
  data: TrendData[];
}

const chartConfig = {
  efficiency: { label: 'Actual', color: 'hsl(var(--chart-1))' },
  target: { label: 'Target', color: 'hsl(var(--muted-foreground))' },
};

export function EfficiencyTrendChart({ data }: EfficiencyTrendChartProps) {
  return (
    <Card className="border border-border/50 shadow-none hover:shadow-sm transition-shadow h-full rounded-2xl">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-foreground leading-tight tracking-tight">Efficiency Trend</div>
            <div className="text-xs text-muted-foreground mt-0.5">Daily efficiency vs target</div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />Actual
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />Target
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="efficiency" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#effGradient)" dot={{ r: 3, fill: 'hsl(var(--card))', stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }} activeDot={{ r: 4, fill: 'hsl(var(--chart-1))' }} />
              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
