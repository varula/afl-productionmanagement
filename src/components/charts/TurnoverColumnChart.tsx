import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface TurnoverData {
  month: string;
  turnover: number;
}

interface TurnoverColumnChartProps {
  data: TurnoverData[];
}

const chartConfig = {
  turnover: { label: 'Turnover %', color: 'hsl(var(--purple))' },
};

export function TurnoverColumnChart({ data }: TurnoverColumnChartProps) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground">Employee Turnover</div>
            <div className="text-[10px] text-muted-foreground">Monthly workforce stability</div>
          </div>
          <span className="text-[8px] font-semibold text-pink bg-pink/10 px-1.5 py-0.5 rounded border border-pink/20">
            Target &lt;3%
          </span>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis dataKey="month" className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={3} stroke="hsl(var(--pink))" strokeDasharray="6 4" strokeWidth={1} opacity={0.5} />
            <Bar dataKey="turnover" fill="hsl(var(--purple))" radius={[6, 6, 0, 0]} opacity={0.75} barSize={28} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
