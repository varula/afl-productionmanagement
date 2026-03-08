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
  minutes: { label: 'Duration (min)', color: 'hsl(var(--chart-4))' },
};

const reasonLabels: Record<string, string> = {
  machine_breakdown: 'Machine BD',
  no_feeding: 'No Input',
  power_failure: 'Power',
  style_changeover: 'Style Change',
  quality_issue: 'QC Hold',
  material_shortage: 'Material',
  absenteeism: 'Absent',
  meeting: 'Meeting',
  maintenance: 'Maintenance',
  other: 'Other',
};

export function DowntimeParetoChart({ data }: DowntimeParetoChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.minutes - a.minutes)
    .map(d => ({ ...d, label: reasonLabels[d.reason] || d.reason }));

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Lost Time by Reason — Today</CardTitle>
          <span className="text-[10px] text-muted-foreground border border-border rounded-[5px] px-2 py-0.5 cursor-pointer">Mar 2026</span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={sorted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} angle={-15} textAnchor="end" height={50} />
            <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="minutes" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
