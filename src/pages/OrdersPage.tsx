import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';

const stageColors: Record<string, string> = {
  Cutting: 'bg-primary/15 text-primary border-primary/30',
  Sewing: 'bg-purple/15 text-purple border-purple/30',
  QC: 'bg-warning/15 text-warning border-warning/30',
  Finishing: 'bg-success/15 text-success border-success/30',
  Packing: 'bg-accent/15 text-accent border-accent/30',
};

const priorityColors: Record<string, string> = {
  high: 'bg-pink/15 text-pink border-pink/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function OrdersPage() {
  const activeFilter = useActiveFilter();
  const today = new Date().toISOString().split('T')[0];

  const { data: plans = [] } = useQuery({
    queryKey: ['orders-plans', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('id, date, line_id, target_qty, lines(line_number, type), styles(style_no, buyer, smv)')
        .eq('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const planIds = (plans as any[]).map(p => p.id);
  const { data: hourly = [] } = useQuery({
    queryKey: ['orders-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hourly_production')
        .select('plan_id, produced_qty')
        .in('plan_id', planIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: planIds.length > 0,
  });

  const orders = useMemo(() => {
    // Group by style (buyer)
    const styleMap = new Map<string, { buyer: string; style: string; totalTarget: number; totalOutput: number; lineType: string }>();
    const outputByPlan = new Map<string, number>();
    for (const h of hourly) outputByPlan.set(h.plan_id, (outputByPlan.get(h.plan_id) ?? 0) + h.produced_qty);

    for (const plan of plans as any[]) {
      const key = plan.styles?.style_no || plan.id;
      const existing = styleMap.get(key) || { buyer: plan.styles?.buyer || '', style: plan.styles?.style_no || '', totalTarget: 0, totalOutput: 0, lineType: plan.lines?.type || 'sewing' };
      existing.totalTarget += plan.target_qty;
      existing.totalOutput += outputByPlan.get(plan.id) ?? 0;
      styleMap.set(key, existing);
    }

    return Array.from(styleMap.entries()).map(([key, v], i) => {
      const progress = v.totalTarget > 0 ? Math.round((v.totalOutput / v.totalTarget) * 100) : 0;
      const stage = v.lineType === 'cutting' ? 'Cutting' : v.lineType === 'finishing' ? 'Finishing' : progress > 80 ? 'QC' : 'Sewing';
      const priority = progress < 70 ? 'high' : progress < 90 ? 'medium' : 'low';
      const status = progress < 80 ? 'delayed' : 'active';
      return {
        id: `AAF-${3100 + i}`,
        buyer: v.buyer,
        style: v.style,
        pcs: v.totalTarget,
        output: v.totalOutput,
        stage,
        progress: Math.min(100, progress),
        priority,
        status,
      };
    });
  }, [plans, hourly]);

  const buyerFilterMap: Record<string, string> = { 'ord-gap': 'Gap', 'ord-lager157': 'Lager 157', 'ord-ucb': 'UCB', 'ord-zxy': 'ZXY', 'ord-cubus': 'Cubus' };
  const stageFilterMap: Record<string, string> = { 'stg-cutting': 'Cutting', 'stg-sewing': 'Sewing', 'stg-qchold': 'QC', 'stg-finishing': 'Finishing', 'stg-packing': 'Packing', 'stg-delayed': '__delayed__' };
  const priorityFilterMap: Record<string, string> = { 'pri-high': 'high', 'pri-medium': 'medium', 'pri-low': 'low' };

  const filteredOrders = useMemo(() => {
    if (!activeFilter || activeFilter === 'ord-all' || activeFilter === 'stg-all') return orders;
    if (buyerFilterMap[activeFilter]) return orders.filter(o => o.buyer === buyerFilterMap[activeFilter]);
    if (activeFilter === 'stg-delayed') return orders.filter(o => o.status === 'delayed');
    if (stageFilterMap[activeFilter]) return orders.filter(o => o.stage === stageFilterMap[activeFilter]);
    if (priorityFilterMap[activeFilter]) return orders.filter(o => o.priority === priorityFilterMap[activeFilter]);
    return orders;
  }, [activeFilter, orders]);

  const avgProgress = filteredOrders.length > 0 ? Math.round(filteredOrders.reduce((s, o) => s + o.progress, 0) / filteredOrders.length) : 0;
  const delayed = filteredOrders.filter(o => o.status === 'delayed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Active Orders
          </h1>
          <p className="text-sm text-muted-foreground">{filteredOrders.length} orders shown</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-8 w-48" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Showing', value: String(filteredOrders.length), color: 'border-primary/20' },
          { label: 'Active', value: String(filteredOrders.filter(o => o.status === 'active').length), color: 'border-success/20' },
          { label: 'Delayed', value: String(delayed), color: 'border-pink/20' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: 'border-accent/20' },
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
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Order Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Order ID</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Buyer</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Style</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Target</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Output</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Stage</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Priority</th>
                  <th className="py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, i) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="py-2.5 px-3 font-bold text-foreground">{order.id}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{order.buyer}</td>
                    <td className="py-2.5 px-3 text-foreground font-medium">{order.style}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{order.pcs.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-foreground">{order.output.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${stageColors[order.stage] || ''}`}>{order.stage}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] capitalize ${priorityColors[order.priority]}`}>{order.priority}</Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Progress value={order.progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{order.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No orders match this filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
