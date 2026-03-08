import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QualityData {
  line: string;
  pass: number;
  rework: number;
  reject: number;
}

interface QualityStackedChartProps {
  data: QualityData[];
}

const chartConfig = {
  pass: { label: 'Pass', color: 'hsl(var(--success))' },
  rework: { label: 'Rework', color: 'hsl(var(--warning))' },
  reject: { label: 'Reject', color: 'hsl(var(--pink))' },
};

export function QualityStackedChart({ data }: QualityStackedChartProps) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Quality Performance by Line</CardTitle>
          <div className="flex items-center gap-3">
            {Object.entries(chartConfig).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <div className="w-2 h-2 rounded-sm" style={{ background: val.color }} />
                {val.label}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="line" className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="pass" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="rework" stackId="a" fill="hsl(var(--warning))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="reject" stackId="a" fill="hsl(var(--pink))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
