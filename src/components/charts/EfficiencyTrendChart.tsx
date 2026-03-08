import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
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
  efficiency: { label: 'Actual %', color: 'hsl(var(--chart-1))' },
  target: { label: 'Target %', color: 'hsl(var(--muted-foreground))' },
};

export function EfficiencyTrendChart({ data }: EfficiencyTrendChartProps) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground leading-tight">Efficiency Trend</div>
            <div className="text-[10px] text-muted-foreground">Daily efficiency vs target</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <div className="w-5 h-[2px] rounded-full bg-primary" />Actual
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <div className="w-5 h-[2px] rounded-full bg-muted-foreground opacity-40" />Target
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="efficiency" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#effGradient)" dot={{ r: 3, fill: 'hsl(var(--card))', stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }} activeDot={{ r: 5, fill: 'hsl(var(--chart-1))' }} />
              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 4" dot={false} opacity={0.4} />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
