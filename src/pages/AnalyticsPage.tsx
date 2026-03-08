import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

export default function AnalyticsPage() {
  const { data: summaries = [] } = useQuery({
    queryKey: ['analytics-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_daily_summary')
        .select('date, efficiency_pct, total_output, total_target, dhu_pct')
        .order('date')
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const efficiencyData = (summaries as any[]).map(s => ({
    date: format(new Date(s.date), 'MMM dd'),
    efficiency: Number(s.efficiency_pct) || 0,
    target: 65,
  }));

  const outputData = (summaries as any[]).map(s => ({
    date: format(new Date(s.date), 'MMM dd'),
    output: s.total_output,
    target: s.total_target,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground">{summaries.length}-day performance overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Efficiency Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[50, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="target" stroke="hsl(348, 94%, 70%)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="efficiency" stroke="hsl(220, 90%, 64%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(220, 90%, 64%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Daily Output vs Target</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={outputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="target" stroke="hsl(348, 94%, 70%)" fill="hsl(348, 94%, 70%)" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="output" stroke="hsl(177, 58%, 50%)" fill="hsl(177, 58%, 50%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
