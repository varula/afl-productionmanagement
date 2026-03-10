import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarDays, Droplets, Download, Target } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { exportToExcel } from '@/lib/excel-utils';
import { toast } from 'sonner';

interface WashingPlanTabProps {
  factoryId: string;
  department: 'sewing' | 'finishing';
}

export function WashingPlanTab({ factoryId, department }: WashingPlanTabProps) {
  const today = new Date();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['washing-plan-entries', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('season_plan_entries')
        .select('*, styles(style_no, buyer, smv), lines(line_number, floors(name)), orders!season_plan_entries_order_id_fkey(season, master_style_no, style_description, color_description, market, channel, po_number, dpo_number, ship_cancel_date)')
        .not('wash_out_date', 'is', null)
        .order('wash_out_date', { ascending: true });
      return data ?? [];
    },
  });

  const { data: unwashedEntries = [] } = useQuery({
    queryKey: ['unwashed-entries', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('season_plan_entries')
        .select('id, styles(style_no, buyer), order_qty, sew_complete_date, ship_date, wash_type')
        .is('wash_out_date', null)
        .order('ship_date', { ascending: true });
      return data ?? [];
    },
  });

  const washData = useMemo(() => {
    return (entries as any[]).map(e => {
      const ord = e.orders;
      const washOutDays = e.wash_out_date ? differenceInDays(parseISO(e.wash_out_date), today) : 999;
      const washDuration = (e.wash_out_date && e.wash_in_house_date)
        ? differenceInDays(parseISO(e.wash_in_house_date), parseISO(e.wash_out_date))
        : null;
      return {
        id: e.id,
        style: e.styles?.style_no || '',
        buyer: e.styles?.buyer || '',
        season: ord?.season || '',
        masterStyle: ord?.master_style_no || '',
        color: ord?.color_description || '',
        po: e.po_number || ord?.po_number || '',
        dpo: e.dpo_number || ord?.dpo_number || '',
        destination: e.destination || '',
        lineNo: e.lines ? `L${e.lines.line_number}` : '—',
        orderQty: e.order_qty,
        cutQty: e.cut_qty || Math.ceil(e.order_qty * 1.05),
        sewCompleteDate: e.sew_complete_date,
        sewCompleteQty: e.sew_complete_qty,
        sewBalance: e.sew_balance || (e.order_qty - (e.sew_complete_qty || 0)),
        washOutDate: e.wash_out_date,
        washInHouseDate: e.wash_in_house_date,
        washDeliveryDate: e.wash_delivery_date,
        washType: e.wash_type || 'external',
        washPlant: e.wash_plant || '',
        inspectionDate: e.inspection_date,
        shipDate: e.ship_date,
        shipCxl: ord?.ship_cancel_date || null,
        status: e.status,
        washOutDays,
        washDuration,
      };
    });
  }, [entries]);

  const pendingWash = washData.filter(w => w.washOutDays > 0 && w.washOutDays <= 7);
  const inWash = washData.filter(w => w.washOutDays <= 0 && (!w.washDeliveryDate || differenceInDays(parseISO(w.washDeliveryDate), today) > 0));

  const handleExport = () => {
    const rows = washData.map(w => ({
      Season: w.season, 'Master Style': w.masterStyle, 'Style #': w.style, Color: w.color,
      Buyer: w.buyer, PO: w.po, DPO: w.dpo, Line: w.lineNo, Destination: w.destination,
      'O/Q': w.orderQty, 'Cut @5%': w.cutQty, 'Sew/Com': w.sewCompleteQty, 'Sew B/L': w.sewBalance,
      'Ship CXL': w.shipCxl || '', 'Wash Plant': w.washPlant, 'Wash Type': w.washType,
      'Wash Out': w.washOutDate || '', 'Wash In': w.washInHouseDate || '',
      'Wash Del': w.washDeliveryDate || '', 'Inspect': w.inspectionDate || '',
      'Ship Date': w.shipDate || '', Status: w.status,
    }));
    exportToExcel(rows, `washing_plan_${format(today, 'yyyy-MM')}`, 'Washing Plan');
    toast.success('Exported washing plan');
  };

  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'dd-MMM') : '—';

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Wash Plans', value: String(washData.length), icon: Droplets, color: 'text-blue-600' },
          { label: 'Pending (≤7d)', value: String(pendingWash.length), icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Currently In Wash', value: String(inWash.length), icon: CalendarDays, color: 'text-blue-600' },
          { label: 'Not Planned', value: String(unwashedEntries.length), icon: Target, color: 'text-muted-foreground' },
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

      {/* Washing Plan Table */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-600" /> Washing Pipeline
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!washData.length} className="gap-1.5 h-7">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Style #', 'Color', 'PO', 'Line', 'O/Q', 'Sew/Com', 'Sew B/L', 'Wash Plant', 'Wash Type', 'Wash Out', 'Wash In', 'Wash Del', 'Duration', 'Days', 'Ship CXL', 'Inspect', 'Ship', 'Status'].map(h => (
                    <th key={h} className={`py-2 px-1.5 text-[8px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['O/Q', 'Sew/Com', 'Sew B/L', 'Duration', 'Days'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={18} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : washData.length === 0 ? (
                  <tr><td colSpan={18} className="py-12 text-center text-muted-foreground">
                    No wash plans found. Add wash dates via the <strong>Season Plan</strong> tab.
                  </td></tr>
                ) : washData.map(w => {
                  const urgencyColor = w.washOutDays <= 0 ? 'text-blue-600 font-bold' : w.washOutDays <= 3 ? 'text-destructive font-bold' : w.washOutDays <= 7 ? 'text-amber-600 font-bold' : 'text-foreground';
                  return (
                    <tr key={w.id} className={`border-b border-border/50 hover:bg-muted/30 ${w.washOutDays <= 3 && w.washOutDays > 0 ? 'bg-destructive/5' : ''}`}>
                      <td className="py-1.5 px-1.5 font-bold text-foreground whitespace-nowrap">{w.style}</td>
                      <td className="py-1.5 px-1.5 text-muted-foreground max-w-[80px] truncate" title={w.color}>{w.color || '—'}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px]">{w.po || '—'}</td>
                      <td className="py-1.5 px-1.5">{w.lineNo}</td>
                      <td className="py-1.5 px-1.5 text-right font-bold">{w.orderQty.toLocaleString()}</td>
                      <td className="py-1.5 px-1.5 text-right font-medium">{w.sewCompleteQty > 0 ? w.sewCompleteQty.toLocaleString() : '—'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-bold ${w.sewBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {w.sewBalance > 0 ? w.sewBalance.toLocaleString() : w.sewBalance === 0 && w.sewCompleteQty > 0 ? '✓' : '—'}
                      </td>
                      <td className="py-1.5 px-1.5 font-medium">{w.washPlant || '—'}</td>
                      <td className="py-1.5 px-1.5">
                        <Badge variant="outline" className={`text-[7px] capitalize ${w.washType === 'in_house' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}`}>
                          {w.washType === 'in_house' ? 'In-House' : 'External'}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-1.5 font-mono text-blue-600 font-medium text-[10px]">{fmtDate(w.washOutDate)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(w.washInHouseDate)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(w.washDeliveryDate)}</td>
                      <td className="py-1.5 px-1.5 text-right">{w.washDuration !== null ? `${w.washDuration}d` : '—'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${urgencyColor}`}>
                        {w.washOutDays <= 0 ? 'In Wash' : `${w.washOutDays}d`}
                      </td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px] text-destructive font-medium">{fmtDate(w.shipCxl)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(w.inspectionDate)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-foreground text-[10px]">{fmtDate(w.shipDate)}</td>
                      <td className="py-1.5 px-1.5 text-center">
                        <Badge variant="outline" className="text-[7px] capitalize">{w.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Styles without wash plan */}
      {(unwashedEntries as any[]).length > 0 && (
        <Card className="border-[1.5px] border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Styles Without Wash Plan ({unwashedEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Style', 'Buyer', 'Order Qty', 'Sew Complete', 'Ship Date', 'Wash Type'].map(h => (
                      <th key={h} className={`py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Order Qty'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(unwashedEntries as any[]).map(e => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">{e.styles?.style_no || '—'}</td>
                      <td className="py-2 px-2 text-muted-foreground">{e.styles?.buyer || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold">{e.order_qty.toLocaleString()}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{fmtDate(e.sew_complete_date)}</td>
                      <td className="py-2 px-2 font-mono text-foreground">{fmtDate(e.ship_date)}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{e.wash_type === 'in_house' ? 'In-House' : 'External'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
