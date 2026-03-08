import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface DeptData {
  department: string;
  productivity: number;
}

interface LaborProductivityChartProps {
  data: DeptData[];
}

const chartConfig = {
  productivity: { label: 'Pcs/Operator', color: 'hsl(var(--chart-1))' },
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--purple))',
];

export function LaborProductivityChart({ data }: LaborProductivityChartProps) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="mb-3">
          <div className="text-[13px] font-bold text-foreground">Labor Productivity</div>
          <div className="text-[10px] text-muted-foreground">Output per operator by department</div>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis dataKey="department" className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis className="text-[9px]" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="productivity" radius={[8, 8, 0, 0]} barSize={36}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
