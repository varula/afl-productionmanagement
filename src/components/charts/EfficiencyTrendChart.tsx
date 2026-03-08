import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  target: { label: 'Target', color: 'hsl(var(--chart-4))' },
};

export function EfficiencyTrendChart({ data }: EfficiencyTrendChartProps) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Daily Output — All Floors</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--chart-1))' }} />This Week
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--chart-4))' }} />Target
            </div>
            <span className="text-[10px] text-muted-foreground border border-border rounded-[5px] px-2 py-0.5 cursor-pointer">Mar 1–8</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis domain={['auto', 'auto']} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="efficiency" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3.5, fill: 'hsl(var(--chart-1))' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="target" stroke="hsl(var(--chart-4))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
