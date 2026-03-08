import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Shirt, PackageCheck } from 'lucide-react';

interface DeptSummary {
  lineCount: number;
  totalTarget: number;
  totalOutput: number;
  totalOps: number;
  avgProgress: number;
  avgEfficiency: number;
}

interface Props {
  cutting: DeptSummary;
  sewing: DeptSummary;
  finishing: DeptSummary;
}

const COLORS = {
  target: 'hsl(var(--muted-foreground) / 0.25)',
  cutting: 'hsl(var(--primary))',
  sewing: 'hsl(262, 60%, 55%)',
  finishing: 'hsl(152, 60%, 45%)',
};

export function DeptComparisonChart({ cutting, sewing, finishing }: Props) {
  const chartData = useMemo(() => [
    {
      name: 'Cutting',
      Target: cutting.totalTarget,
      Output: cutting.totalOutput,
      fill: COLORS.cutting,
      lines: cutting.lineCount,
      ops: cutting.totalOps,
      progress: cutting.avgProgress,
    },
    {
      name: 'Sewing',
      Target: sewing.totalTarget,
      Output: sewing.totalOutput,
      fill: COLORS.sewing,
      lines: sewing.lineCount,
      ops: sewing.totalOps,
      progress: sewing.avgProgress,
    },
    {
      name: 'Finishing',
      Target: finishing.totalTarget,
      Output: finishing.totalOutput,
      fill: COLORS.finishing,
      lines: finishing.lineCount,
      ops: finishing.totalOps,
      progress: finishing.avgProgress,
    },
  ], [cutting, sewing, finishing]);

  const totalTarget = cutting.totalTarget + sewing.totalTarget + finishing.totalTarget;
  const totalOutput = cutting.totalOutput + sewing.totalOutput + finishing.totalOutput;
  const overallProgress = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Cross-Department Comparison</CardTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Scissors className="h-3 w-3" /> Cutting</span>
            <span className="flex items-center gap-1"><Shirt className="h-3 w-3" /> Sewing</span>
            <span className="flex items-center gap-1"><PackageCheck className="h-3 w-3" /> Finishing</span>
            <span className="font-semibold text-foreground ml-2">
              Overall: {totalOutput.toLocaleString()} / {totalTarget.toLocaleString()} ({overallProgress}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                labelFormatter={(label) => {
                  const d = chartData.find(c => c.name === label);
                  return `${label} — ${d?.lines} lines, ${d?.ops} operators, ${d?.progress}% progress`;
                }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="Target" fill={COLORS.target} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Output" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
