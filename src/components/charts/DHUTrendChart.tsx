import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface DHUData {
  date: string;
  dhu: number;
}

interface DHUTrendChartProps {
  data: DHUData[];
  ucl?: number;
  lcl?: number;
  target?: number;
}

const chartConfig = {
  dhu: { label: 'DHU %', color: 'hsl(var(--chart-4))' },
};

export function DHUTrendChart({ data, ucl = 5, lcl = 1, target = 3 }: DHUTrendChartProps) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground leading-tight">DHU % Control Chart</div>
            <div className="text-[10px] text-muted-foreground">Statistical process control</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[8px] font-semibold text-pink bg-pink/10 px-1.5 py-0.5 rounded border border-pink/20">UCL {ucl}%</span>
            <span className="text-[8px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20">Target {target}%</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={ucl} stroke="hsl(var(--pink))" strokeDasharray="6 4" strokeWidth={1} opacity={0.6} />
              <ReferenceLine y={target} stroke="hsl(var(--success))" strokeDasharray="6 4" strokeWidth={1} opacity={0.6} />
              <ReferenceLine y={lcl} stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth={1} opacity={0.4} />
              <Line type="monotone" dataKey="dhu" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--card))', stroke: 'hsl(var(--chart-4))', strokeWidth: 2 }} activeDot={{ r: 5, fill: 'hsl(var(--chart-4))' }} />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
