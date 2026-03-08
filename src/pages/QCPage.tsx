import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const statusColors: Record<string, string> = {
  passed: 'bg-success/15 text-success border-success/30',
  failed: 'bg-pink/15 text-pink border-pink/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  on_hold: 'bg-purple/15 text-purple border-purple/30',
};

export default function QCPage() {
  const activeFilter = useActiveFilter();
  const today = new Date().toISOString().split('T')[0];

  const { data: plans = [] } = useQuery({
    queryKey: ['qc-plans', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('id, line_id, lines(line_number, type, floor_id, floors(name))')
        .eq('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const planIds = (plans as any[]).map(p => p.id);
  const { data: hourly = [] } = useQuery({
    queryKey: ['qc-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('plan_id, checked_qty, defects, rework')
        .in('plan_id', planIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: planIds.length > 0,
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ['qc-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_daily_summary')
        .select('date, dhu_pct')
        .order('date', { ascending: true })
        .limit(7);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inspections = useMemo(() => {
    return (plans as any[]).map(plan => {
      const records = hourly.filter(h => h.plan_id === plan.id);
      const checked = records.reduce((s, r) => s + r.checked_qty, 0);
      const defects = records.reduce((s, r) => s + r.defects, 0);
      const dhu = checked > 0 ? (defects / checked) * 100 : 0;
      const floorName = (plan.lines as any)?.floors?.name || '';
      const floorKey = `qcf-${floorName.toLowerCase().replace(/[-\s]/g, '')}`;
      let status = 'passed';
      if (dhu > 4) status = 'failed';
      else if (dhu > 3) status = 'on_hold';
      else if (records.length === 0) status = 'pending';

      return {
        id: plan.id,
        line: `${(plan.lines as any)?.type === 'cutting' ? 'Table' : 'Line'} ${(plan.lines as any)?.line_number}`,
        floor: floorName,
        floorKey,
        checked,
        defects,
        dhu: Math.round(dhu * 10) / 10,
        status,
      };
    }).sort((a, b) => a.line.localeCompare(b.line));
  }, [plans, hourly]);

  // Defect types summary
  const defectData = useMemo(() => {
    const byLine = inspections.filter(i => i.defects > 0).sort((a, b) => b.defects - a.defects).slice(0, 6);
    return byLine.map(i => ({ type: i.line, count: i.defects }));
  }, [inspections]);

  const dhuTrend = useMemo(() => {
    return (summaries as any[]).map(s => ({
      day: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }),
      dhu: Number(s.dhu_pct) || 0,
    }));
  }, [summaries]);

  const filteredInspections = useMemo(() => {
    if (!activeFilter || activeFilter === 'qc-all' || activeFilter === 'qc-today') return inspections;
    if (activeFilter === 'qc-pending') return inspections.filter(i => i.status === 'pending');
    if (activeFilter === 'qc-failed') return inspections.filter(i => i.status === 'failed');
    if (activeFilter === 'qc-passed') return inspections.filter(i => i.status === 'passed');
    if (activeFilter === 'qc-hold') return inspections.filter(i => i.status === 'on_hold');
    return inspections.filter(i => i.floorKey === activeFilter);
  }, [activeFilter, inspections]);

  const totalChecked = filteredInspections.reduce((s, i) => s + i.checked, 0);
  const totalDefects = filteredInspections.reduce((s, i) => s + i.defects, 0);
  const dhu = totalChecked > 0 ? ((totalDefects / totalChecked) * 100).toFixed(1) : '0.0';
  const passRate = totalChecked > 0 ? (((totalChecked - totalDefects) / totalChecked) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-success" /> Quality Control
        </h1>
        <p className="text-sm text-muted-foreground">{filteredInspections.length} inspections shown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pass Rate', value: `${passRate}%`, color: 'border-success/20' },
          { label: 'DHU%', value: `${dhu}%`, color: 'border-warning/20' },
          { label: 'Total Checked', value: totalChecked.toLocaleString(), color: 'border-primary/20' },
          { label: 'Defects Found', value: totalDefects.toLocaleString(), color: 'border-pink/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Inspections</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Line</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Floor</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Checked</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Defects</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">DHU%</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp, i) => (
                  <tr key={insp.id} className="border-b border-border/50 hover:bg-muted/30 animate-pop-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="py-2.5 px-3 font-bold text-foreground">{insp.line}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{insp.floor}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{insp.checked.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">{insp.defects}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{insp.dhu}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[insp.status] || ''}`}>{insp.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredInspections.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No inspections match this filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Defects by Line</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={defectData}>
                <XAxis dataKey="type" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(348, 94%, 70%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">DHU% Trend (This Week)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dhuTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 4]} />
                <Tooltip />
                <Line type="monotone" dataKey="dhu" stroke="hsl(348, 94%, 70%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
