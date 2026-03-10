import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ship, CalendarDays, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';

interface SeasonPlanTabProps {
  factoryId: string;
  department: 'sewing' | 'finishing';
}

export function SeasonPlanTab({ factoryId, department }: SeasonPlanTabProps) {
  const today = new Date();
  const seasonStart = format(today, 'yyyy-MM-dd');
  const seasonEnd = format(addMonths(today, 4), 'yyyy-MM-dd');

  // Fetch shipments with style data for the season window
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['season-shipments', factoryId, seasonEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from('shipments')
        .select('*, styles(style_no, buyer, smv)')
        .or(`expected_delivery.gte.${seasonStart},ship_date.gte.${seasonStart}`)
        .order('expected_delivery', { ascending: true });
      return data ?? [];
    },
  });

  // Fetch all production plans for season window to calculate PCD/PSD progress
  const { data: plans = [] } = useQuery({
    queryKey: ['season-plans', factoryId, department, seasonEnd],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data: lineData } = await supabase.from('lines').select('id').eq('type', department).in('floor_id', floors.map(f => f.id));
      if (!lineData?.length) return [];
      const { data } = await supabase
        .from('production_plans')
        .select('date, style_id, target_qty, styles(style_no, buyer)')
        .in('line_id', lineData.map(l => l.id))
        .gte('date', format(addMonths(today, -1), 'yyyy-MM-dd'))
        .lte('date', seasonEnd);
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  // Build season timeline per style
  const seasonData = useMemo(() => {
    // Group plans by style
    const stylePlanMap = new Map<string, { totalTarget: number; firstDate: string; lastDate: string; days: number }>();
    for (const p of plans as any[]) {
      const key = p.styles?.style_no || p.style_id;
      const existing = stylePlanMap.get(key) || { totalTarget: 0, firstDate: p.date, lastDate: p.date, days: 0 };
      existing.totalTarget += p.target_qty;
      if (p.date < existing.firstDate) existing.firstDate = p.date;
      if (p.date > existing.lastDate) existing.lastDate = p.date;
      existing.days += 1;
      stylePlanMap.set(key, existing);
    }

    // Merge with shipments
    const styleMap = new Map<string, {
      style: string; buyer: string; orderRef: string;
      orderQty: number; packedQty: number; shippedQty: number;
      shipDate: string | null; expectedDelivery: string | null;
      pcd: string | null; psd: string | null;
      status: string; daysToShip: number;
      productionTarget: number; productionDays: number;
    }>();

    for (const s of shipments as any[]) {
      const styleNo = s.styles?.style_no || s.order_ref;
      const shipDate = s.ship_date || s.expected_delivery;
      const expectedDelivery = s.expected_delivery;

      // Estimate PCD as first plan date, PSD as plan start + buffer
      const planData = stylePlanMap.get(styleNo);
      const pcd = planData?.firstDate || null;
      const psd = pcd ? format(parseISO(pcd), 'yyyy-MM-dd') : null;
      const daysToShip = shipDate ? differenceInDays(parseISO(shipDate), today) : 999;

      const key = `${styleNo}-${s.order_ref}`;
      if (!styleMap.has(key)) {
        styleMap.set(key, {
          style: styleNo,
          buyer: s.buyer || s.styles?.buyer || '',
          orderRef: s.order_ref,
          orderQty: s.quantity,
          packedQty: s.packed_qty,
          shippedQty: s.shipped_qty,
          shipDate,
          expectedDelivery,
          pcd,
          psd,
          status: s.status,
          daysToShip,
          productionTarget: planData?.totalTarget || 0,
          productionDays: planData?.days || 0,
        });
      }
    }

    return Array.from(styleMap.values()).sort((a, b) => a.daysToShip - b.daysToShip);
  }, [shipments, plans]);

  const urgentOrders = seasonData.filter(s => s.daysToShip <= 30 && s.status !== 'delivered');
  const onTrack = seasonData.filter(s => s.daysToShip > 30 || s.status === 'delivered');

  const statusColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    packed: 'bg-primary/15 text-primary border-primary/30',
    dispatched: 'bg-accent/15 text-accent border-accent/30',
    in_transit: 'bg-warning/15 text-warning border-warning/30',
    delivered: 'bg-success/15 text-success border-success/30',
    delayed: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Season Window', value: `${format(today, 'MMM')} – ${format(addMonths(today, 3), 'MMM yyyy')}`, icon: CalendarDays, color: 'text-primary' },
          { label: 'Total Orders', value: String(seasonData.length), icon: Target, color: 'text-success' },
          { label: 'Urgent (≤30d)', value: String(urgentOrders.length), icon: AlertTriangle, color: 'text-destructive' },
          { label: 'On Track', value: String(onTrack.length), icon: CheckCircle2, color: 'text-success' },
        ].map(k => (
          <Card key={k.label} className="border-[1.5px]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</span>
              </div>
              <p className="text-lg font-extrabold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" /> Season Plan — PCD/PSD to Shipment Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Style', 'Buyer', 'Order Ref', 'Order Qty', 'PCD', 'PSD', 'Ship Date', 'Expected Delivery', 'Days Left', 'Prod. Target', 'Prod. Days', 'Packed', 'Status', 'Timeline'].map(h => (
                    <th key={h} className={`py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['Order Qty', 'Days Left', 'Prod. Target', 'Prod. Days', 'Packed'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentsLoading ? (
                  <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">Loading season data...</td></tr>
                ) : seasonData.length === 0 ? (
                  <tr><td colSpan={14} className="py-12 text-center text-muted-foreground">No shipments found for the upcoming season. Add shipments to see the season plan.</td></tr>
                ) : seasonData.map((item, i) => {
                  const totalSpan = item.shipDate && item.pcd
                    ? differenceInDays(parseISO(item.shipDate), parseISO(item.pcd))
                    : 90;
                  const elapsed = item.pcd
                    ? differenceInDays(today, parseISO(item.pcd))
                    : 0;
                  const timelinePct = totalSpan > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalSpan) * 100))) : 0;
                  const urgencyColor = item.daysToShip <= 14 ? 'text-destructive font-bold' : item.daysToShip <= 30 ? 'text-warning font-bold' : 'text-foreground';

                  return (
                    <tr key={`${item.style}-${item.orderRef}-${i}`} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium text-foreground">{item.style}</td>
                      <td className="py-2 px-2 text-muted-foreground">{item.buyer}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{item.orderRef}</td>
                      <td className="py-2 px-2 text-right font-bold text-foreground">{item.orderQty.toLocaleString()}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{item.pcd ? format(parseISO(item.pcd), 'MMM d') : '—'}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{item.psd ? format(parseISO(item.psd), 'MMM d') : '—'}</td>
                      <td className="py-2 px-2 font-mono text-foreground font-medium">{item.shipDate ? format(parseISO(item.shipDate), 'MMM d') : '—'}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{item.expectedDelivery ? format(parseISO(item.expectedDelivery), 'MMM d') : '—'}</td>
                      <td className={`py-2 px-2 text-right ${urgencyColor}`}>{item.daysToShip < 999 ? `${item.daysToShip}d` : '—'}</td>
                      <td className="py-2 px-2 text-right">{item.productionTarget > 0 ? item.productionTarget.toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-right">{item.productionDays > 0 ? item.productionDays : '—'}</td>
                      <td className="py-2 px-2 text-right">{item.packedQty > 0 ? item.packedQty.toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline" className={`text-[9px] capitalize ${statusColors[item.status] || ''}`}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 w-24">
                        <div className="flex items-center gap-1">
                          <Progress value={timelinePct} className="h-1.5 flex-1" />
                          <span className="text-[9px] font-bold text-muted-foreground w-7 text-right">{timelinePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
