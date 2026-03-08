import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  'hsl(var(--chart-1))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-6))',
];

export function LaborProductivityChart({ data }: LaborProductivityChartProps) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-bold">Labor Productivity by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="department" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="productivity" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
