import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

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
    <Card className="border border-border/60 shadow-none hover:shadow-md transition-shadow h-full rounded-2xl">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-foreground leading-tight">Downtime Pareto</div>
            <div className="text-xs text-muted-foreground mt-0.5">Top loss reasons ranked</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={sorted} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} angle={-20} textAnchor="end" height={45} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="minutes" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} opacity={0.8} barSize={28} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
