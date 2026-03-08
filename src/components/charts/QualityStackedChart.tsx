import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

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
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground">Quality Performance</div>
            <div className="text-[10px] text-muted-foreground">Pass / Rework / Reject by line</div>
          </div>
          <div className="flex items-center gap-2.5">
            {Object.entries(chartConfig).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1 text-[8px] font-semibold text-muted-foreground">
                <div className="w-2 h-2 rounded-[2px]" style={{ background: val.color }} />
                {val.label}
              </div>
            ))}
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis dataKey="line" className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="pass" stackId="q" fill="hsl(var(--success))" opacity={0.8} />
            <Bar dataKey="rework" stackId="q" fill="hsl(var(--warning))" opacity={0.8} />
            <Bar dataKey="reject" stackId="q" fill="hsl(var(--pink))" radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
