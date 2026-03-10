import { useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Droplets, CalendarDays, Target, AlertTriangle, CheckCircle2, Upload, Download, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';

interface WashingPlanTabProps {
  factoryId: string;
  department: 'sewing' | 'finishing';
}

export function WashingPlanTab({ factoryId, department }: WashingPlanTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date();

  // Fetch season entries that have wash dates
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['washing-plan-entries', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('season_plan_entries')
        .select('*, styles(style_no, buyer, smv), lines(line_number, floors(name)), shipments(order_ref)')
        .not('wash_out_date', 'is', null)
        .order('wash_out_date', { ascending: true });
      return data ?? [];
    },
  });

  // Also show entries without wash dates for "not planned" visibility
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
      const washOutDays = e.wash_out_date ? differenceInDays(parseISO(e.wash_out_date), today) : 999;
      const washDuration = (e.wash_out_date && e.wash_in_house_date)
        ? differenceInDays(parseISO(e.wash_in_house_date), parseISO(e.wash_out_date))
        : null;
      return {
        id: e.id,
        style: e.styles?.style_no || '',
        buyer: e.styles?.buyer || '',
        lineNo: e.lines ? `L${e.lines.line_number}` : '—',
        orderRef: e.shipments?.order_ref || '',
        orderQty: e.order_qty,
        sewCompleteDate: e.sew_complete_date,
        washOutDate: e.wash_out_date,
        washInHouseDate: e.wash_in_house_date,
        washDeliveryDate: e.wash_delivery_date,
        washType: e.wash_type || 'external',
        inspectionDate: e.inspection_date,
        shipDate: e.ship_date,
        sewCompleteQty: e.sew_complete_qty,
        status: e.status,
        washOutDays,
        washDuration,
      };
    });
  }, [entries]);

  const pendingWash = washData.filter(w => w.washOutDays > 0 && w.washOutDays <= 7);
  const inWash = washData.filter(w => w.washOutDays <= 0 && (!w.washDeliveryDate || differenceInDays(parseISO(w.washDeliveryDate), today) > 0));
  const totalEntries = washData.length;

  const handleExport = () => {
    const rows = washData.map(w => ({
      Style: w.style, Buyer: w.buyer, Line: w.lineNo, 'Order Ref': w.orderRef,
      'Order Qty': w.orderQty, 'Sew Complete': w.sewCompleteDate || '',
      'Wash Out': w.washOutDate || '', 'Wash In-House': w.washInHouseDate || '',
      'Wash Delivery': w.washDeliveryDate || '', 'Wash Type': w.washType,
      'Inspection': w.inspectionDate || '', 'Ship Date': w.shipDate || '',
      'Sew Comp Qty': w.sewCompleteQty, Status: w.status,
    }));
    exportToExcel(rows, `washing_plan_${format(today, 'yyyy-MM')}`, 'Washing Plan');
    toast.success('Exported washing plan');
  };

  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'MMM d') : '—';

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Wash Plans', value: String(totalEntries), icon: Droplets, color: 'text-blue-600' },
          { label: 'Pending Wash (≤7d)', value: String(pendingWash.length), icon: AlertTriangle, color: 'text-warning' },
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

      {/* Main washing plan table */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-600" /> Washing Plan — Sew Complete → Wash Out → Wash In → Delivery
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!washData.length} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Style', 'Buyer', 'Line', 'Order Qty', 'Sew Comp', 'Sew Qty', 'Wash Type', 'Wash Out', 'Wash In', 'Wash Del', 'Duration', 'Days to Wash', 'Inspect', 'Ship', 'Status'].map(h => (
                    <th key={h} className={`py-2 px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['Order Qty', 'Sew Qty', 'Duration', 'Days to Wash'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={15} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : washData.length === 0 ? (
                  <tr><td colSpan={15} className="py-12 text-center text-muted-foreground">
                    No wash plans found. Add wash dates via the <strong>Season Plan</strong> tab to see them here.
                  </td></tr>
                ) : washData.map(w => {
                  const urgencyColor = w.washOutDays <= 0 ? 'text-blue-600 font-bold' : w.washOutDays <= 3 ? 'text-destructive font-bold' : w.washOutDays <= 7 ? 'text-warning font-bold' : 'text-foreground';
                  const washTypeColor = w.washType === 'in_house' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-muted text-muted-foreground';
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-1.5 font-medium text-foreground">{w.style}</td>
                      <td className="py-2 px-1.5 text-muted-foreground text-[10px]">{w.buyer}</td>
                      <td className="py-2 px-1.5">{w.lineNo}</td>
                      <td className="py-2 px-1.5 text-right font-bold">{w.orderQty.toLocaleString()}</td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(w.sewCompleteDate)}</td>
                      <td className="py-2 px-1.5 text-right">{w.sewCompleteQty > 0 ? w.sewCompleteQty.toLocaleString() : '—'}</td>
                      <td className="py-2 px-1.5">
                        <Badge variant="outline" className={`text-[8px] capitalize ${washTypeColor}`}>{w.washType === 'in_house' ? 'In-House' : 'External'}</Badge>
                      </td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 font-medium text-[10px]">{fmtDate(w.washOutDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(w.washInHouseDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(w.washDeliveryDate)}</td>
                      <td className="py-2 px-1.5 text-right">{w.washDuration !== null ? `${w.washDuration}d` : '—'}</td>
                      <td className={`py-2 px-1.5 text-right ${urgencyColor}`}>
                        {w.washOutDays <= 0 ? 'In Wash' : `${w.washOutDays}d`}
                      </td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(w.inspectionDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-foreground text-[10px]">{fmtDate(w.shipDate)}</td>
                      <td className="py-2 px-1.5 text-center">
                        <Badge variant="outline" className="text-[8px] capitalize">{w.status}</Badge>
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
        <Card className="border-[1.5px] border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-warning">
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
