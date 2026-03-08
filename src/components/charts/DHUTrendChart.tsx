import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">DHU % Trend — Control Chart</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--chart-4))' }} />DHU
            </div>
            <div className="flex items-center gap-1 text-[9px] text-pink">
              <div className="w-4 h-0 border-t border-dashed border-pink" />UCL
            </div>
            <div className="flex items-center gap-1 text-[9px] text-success">
              <div className="w-4 h-0 border-t border-dashed border-success" />Target
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis domain={[0, 'auto']} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={ucl} stroke="hsl(var(--pink))" strokeDasharray="5 5" strokeWidth={1.5} />
            <ReferenceLine y={target} stroke="hsl(var(--success))" strokeDasharray="5 5" strokeWidth={1.5} />
            <ReferenceLine y={lcl} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeWidth={1} />
            <Line type="monotone" dataKey="dhu" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={{ r: 3.5, fill: 'hsl(var(--chart-4))' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
