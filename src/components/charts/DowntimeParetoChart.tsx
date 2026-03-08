import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DowntimeData {
  reason: string;
  minutes: number;
}

interface DowntimeParetoChartProps {
  data: DowntimeData[];
}

const chartConfig = {
  minutes: { label: 'Downtime (min)', color: 'hsl(var(--chart-4))' },
};

const reasonLabels: Record<string, string> = {
  machine_breakdown: 'Machine Breakdown',
  no_feeding: 'No Feeding',
  power_failure: 'Power Failure',
  style_changeover: 'Style Changeover',
  quality_issue: 'Quality Issue',
  material_shortage: 'Material Shortage',
  absenteeism: 'Absenteeism',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  other: 'Other',
};

export function DowntimeParetoChart({ data }: DowntimeParetoChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.minutes - a.minutes)
    .map(d => ({ ...d, label: reasonLabels[d.reason] || d.reason }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Downtime Pareto</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={sorted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              className="text-[9px]"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="minutes" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
