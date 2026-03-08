import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

export default function MISPage() {
  const today = new Date().toISOString().split('T')[0];

  const { data: summary } = useQuery({
    queryKey: ['mis-summary', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_daily_summary')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['mis-plans', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('target_qty, planned_operators, planned_helpers, working_hours, styles(smv)')
        .eq('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const misCards = useMemo(() => {
    const s = summary;
    const totalOperators = (plans as any[]).reduce((sum, p) => sum + p.planned_operators + p.planned_helpers, 0);
    const totalTarget = (plans as any[]).reduce((sum, p) => sum + p.target_qty, 0);
    const totalOutput = s?.total_output ?? 0;
    const avgSmv = (plans as any[]).length > 0
      ? (plans as any[]).reduce((sum, p) => sum + (p.styles?.smv ?? 0) * p.target_qty, 0) / (totalTarget || 1) : 0;
    const samEarned = totalOutput * avgSmv;
    const samAvailable = totalOperators * ((plans as any[])[0]?.working_hours ?? 8) * 60;
    const utilization = samAvailable > 0 ? (samEarned / samAvailable) * 100 : 0;

    return [
      { label: 'Efficiency', value: `${Number(s?.efficiency_pct ?? 0).toFixed(1)}%`, trend: `Target 65%`, up: (s?.efficiency_pct ?? 0) >= 65 },
      { label: 'SAM Earned / Available', value: `${utilization.toFixed(1)}%`, trend: `${Math.round(samEarned).toLocaleString()} / ${Math.round(samAvailable).toLocaleString()} SAM`, up: utilization >= 85 },
      { label: 'Capacity Utilization', value: `${Number(s?.capacity_utilization_pct ?? 0).toFixed(1)}%`, trend: `${s?.total_machines ?? 0} machines`, up: (s?.capacity_utilization_pct ?? 0) >= 85 },
      { label: 'DHU %', value: `${Number(s?.dhu_pct ?? 0).toFixed(1)}%`, trend: `${s?.total_defects ?? 0} defects`, up: (s?.dhu_pct ?? 0) <= 3 },
      { label: 'Lost Time %', value: `${Number(s?.lost_time_pct ?? 0).toFixed(1)}%`, trend: `${s?.total_downtime_minutes ?? 0} + ${s?.total_npt_minutes ?? 0} min`, up: (s?.lost_time_pct ?? 0) <= 8 },
      { label: 'Absenteeism', value: `${Number(s?.absenteeism_pct ?? 0).toFixed(1)}%`, trend: `${s?.present_operators ?? 0} / ${s?.planned_operators ?? 0} present`, up: (s?.absenteeism_pct ?? 0) <= 5 },
      { label: 'Man:Machine Ratio', value: `${Number(s?.man_to_machine_ratio ?? 0).toFixed(2)}:1`, trend: `${s?.total_manpower ?? 0} workers · ${s?.total_machines ?? 0} machines`, up: true },
      { label: 'RFT %', value: `${Number(s?.rft_pct ?? 0).toFixed(1)}%`, trend: `${(s?.total_checked ?? 0) - (s?.total_defects ?? 0)} / ${s?.total_checked ?? 0} passed`, up: (s?.rft_pct ?? 0) >= 95 },
    ];
  }, [summary, plans]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple" /> MIS Reports
        </h1>
        <p className="text-sm text-muted-foreground">Management Information System — Today's Key Indicators</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {misCards.map((c, i) => (
          <Card key={c.label} className="border-[1.5px] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-pop-in" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-3.5">
              <p className="text-lg font-extrabold text-foreground">{c.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-0.5">{c.label}</p>
              <p className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${c.up ? 'text-success' : 'text-pink'}`}>
                {c.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {c.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
