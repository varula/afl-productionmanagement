import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, ChevronRight, FileCheck, Scissors, Shield, Shirt, PackageCheck, ClipboardCheck, Building, Warehouse, CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { MIS_SECTIONS } from '@/lib/mis-form-configs';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';

const ICON_MAP: Record<string, any> = {
  FileCheck, Scissors, ShieldCheck: Shield, Shirt, Shield, PackageCheck, ClipboardCheck, Building, Warehouse,
};

const SECTION_ROUTES: Record<string, string> = {
  pre_production: '/mis/pre-production',
  cutting_production: '/mis/cutting-production',
  cutting_quality: '/mis/cutting-quality',
  sewing_production: '/mis/sewing-production',
  sewing_quality: '/mis/sewing-quality',
  finishing_production: '/mis/finishing-production',
  finishing_quality: '/mis/finishing-quality',
  general: '/mis/general',
  stores: '/mis/stores',
};

export default function MISPage() {
  const navigate = useNavigate();
  const factoryId = useFactoryId();
  const activeFilter = useActiveFilter();
  const today = new Date().toISOString().split('T')[0];

  // Map sidebar Report Type filters to MIS section keys
  const REPORT_TYPE_FILTER: Record<string, string[]> = {
    'rp-production': ['sewing_production', 'cutting_production', 'finishing_production'],
    'rp-qc': ['cutting_quality', 'sewing_quality', 'finishing_quality'],
    'rp-shipment': ['finishing_production', 'stores'],
    'rp-attendance': ['general'],
    'rp-inventory': ['stores'],
    'rp-machine': ['general'],
    'rp-buyer': ['pre_production'],
  };

  // Factory daily summary - try factory filter, fallback to any
  const { data: summary } = useQuery({
    queryKey: ['mis-summary', today, factoryId],
    queryFn: async () => {
      let query = supabase.from('factory_daily_summary').select('*').eq('date', today);
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query.maybeSingle();
      if (error) {
        // If factoryId filter returns nothing, try without
        const { data: fallback } = await supabase.from('factory_daily_summary').select('*').eq('date', today).maybeSingle();
        return fallback;
      }
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

  // Document counts per section
  const { data: docCounts = {} } = useQuery({
    queryKey: ['mis-doc-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mis_documents').select('section');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => { counts[d.section] = (counts[d.section] || 0) + 1; });
      return counts;
    },
  });

  // Status breakdown for today
  const { data: statusCounts = { draft: 0, pending: 0, completed: 0, approved: 0, total: 0 } } = useQuery({
    queryKey: ['mis-status-counts', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('mis_documents').select('status').eq('date', today);
      if (error) throw error;
      const counts = { draft: 0, pending: 0, completed: 0, approved: 0, total: 0 };
      (data ?? []).forEach((d: any) => {
        counts.total++;
        if (d.status === 'draft') counts.draft++;
        else if (d.status === 'pending') counts.pending++;
        else if (d.status === 'completed') counts.completed++;
        else if (d.status === 'approved') counts.approved++;
      });
      return counts;
    },
  });

  const misCards = useMemo(() => {
    const s = summary;
    const totalOperators = (plans as any[]).reduce((sum, p) => sum + p.planned_operators + p.planned_helpers, 0);
    const totalTarget = (plans as any[]).reduce((sum, p) => sum + p.target_qty, 0);
    const totalOutput = s?.total_output ?? 0;
    const avgSmv = (plans as any[]).length > 0
      ? (plans as any[]).reduce((sum, p) => sum + (p.styles?.smv ?? 0) * p.target_qty, 0) / (totalTarget || 1) : (s?.weighted_smv ?? 0);
    const samEarned = totalOutput * (avgSmv || (s?.weighted_smv ?? 0));
    const workingHours = (plans as any[])[0]?.working_hours ?? (s?.total_working_minutes ? s.total_working_minutes / 60 : 8);
    const samAvailable = (totalOperators || (s?.total_manpower ?? 0)) * workingHours * 60;
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

  const completionPct = statusCounts.total > 0
    ? Math.round(((statusCounts.completed + statusCounts.approved) / statusCounts.total) * 100)
    : 0;

  const totalDocs = Object.values(docCounts as Record<string, number>).reduce((a, b) => a + b, 0);

  // Filter sections based on sidebar Report Type selection
  const allowedSections = REPORT_TYPE_FILTER[activeFilter] ?? null;
  const filteredSections = allowedSections
    ? MIS_SECTIONS.filter(s => allowedSections.includes(s.key))
    : MIS_SECTIONS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> MIS Reports
          </h1>
          <p className="text-sm text-muted-foreground">Management Information System — Key Indicators & Document Modules</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <CalendarDays className="h-3 w-3" /> {today}
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/30 text-xs" variant="outline">
            {totalDocs} total records
          </Badge>
        </div>
      </div>

      {/* Today's Document Progress */}
      <Card className="border-[1.5px]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Today's Document Progress</p>
            <span className="text-xs font-bold text-primary">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2 mb-3" />
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Draft: {statusCounts.draft}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending: {statusCounts.pending}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Completed: {statusCounts.completed}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved: {statusCounts.approved}</span>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {misCards.map((c, i) => (
          <Card key={c.label} className="border-[1.5px] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-pop-in" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-3.5">
              <p className="text-lg font-extrabold text-foreground">{c.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-0.5">{c.label}</p>
              <p className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${c.up ? 'text-emerald-500' : 'text-pink-500'}`}>
                {c.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {c.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section Navigation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Document Modules</h2>
          {allowedSections && (
            <Badge variant="outline" className="text-[10px]">
              Filtered: {filteredSections.length} of {MIS_SECTIONS.length} modules
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSections.map((section) => {
            const Icon = ICON_MAP[section.icon] || FileCheck;
            const count = (docCounts as Record<string, number>)[section.key] || 0;
            const route = SECTION_ROUTES[section.key];

            return (
              <Card
                key={section.key}
                className="border-[1.5px] transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
                onClick={() => navigate(route)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{section.label}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {section.count} document types · <span className="font-semibold text-foreground">{count}</span> record{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
