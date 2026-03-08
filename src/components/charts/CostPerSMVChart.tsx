import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface CostPerSMVChartProps {
  data: { date: string; cost: number }[];
}

export function CostPerSMVChart({ data }: CostPerSMVChartProps) {
  const avgCost = data.length > 0 ? data.reduce((s, d) => s + d.cost, 0) / data.length : 0;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold text-foreground leading-tight">Cost per SMV Trend</div>
            <div className="text-[10px] text-muted-foreground">Cost fluctuation over time</div>
          </div>
          <span className="text-[8px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
            Avg: ${avgCost.toFixed(2)}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost/SMV']}
                />
                <ReferenceLine y={avgCost} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{ value: 'Avg', fontSize: 9, fill: 'hsl(var(--warning))' }} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                  dot={{ r: 3, fill: 'hsl(var(--accent))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
