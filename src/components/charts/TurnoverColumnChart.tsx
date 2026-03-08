import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TurnoverData {
  month: string;
  turnover: number;
}

interface TurnoverColumnChartProps {
  data: TurnoverData[];
}

const chartConfig = {
  turnover: { label: 'Turnover %', color: 'hsl(var(--chart-6))' },
};

export function TurnoverColumnChart({ data }: TurnoverColumnChartProps) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-bold">Employee Turnover — Monthly</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="turnover" fill="hsl(var(--chart-6))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
