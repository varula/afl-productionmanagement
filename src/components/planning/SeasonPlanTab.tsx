import { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Ship, CalendarDays, Target, AlertTriangle, CheckCircle2, Plus, Pencil, Trash2, Upload, Download, ArrowLeft } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths, subDays } from 'date-fns';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';
import { SeasonGanttChart } from './SeasonGanttChart';

interface SeasonPlanTabProps {
  factoryId: string;
  department: 'sewing' | 'finishing';
}

// Backward planning defaults (days before delivery)
const BACKWARD_DEFAULTS = {
  inspection_to_delivery: 3,    // inspection 3 days before delivery
  wash_delivery_to_inspection: 2, // wash delivery 2 days before inspection
  wash_in_house_to_wash_delivery: 3, // wash in-house 3 days before wash delivery
  wash_out_to_wash_in_house: 5,   // wash out 5 days before wash in-house
  sew_complete_to_wash_out: 2,    // sew complete 2 days before wash out
  plan_sew_to_sew_complete: 15,   // sew start 15 days before sew complete
  plan_cut_to_plan_sew: 5,        // cut start 5 days before sew start
};

function calcBackwardDates(deliveryDate: string) {
  const d = parseISO(deliveryDate);
  const inspection = subDays(d, BACKWARD_DEFAULTS.inspection_to_delivery);
  const washDelivery = subDays(inspection, BACKWARD_DEFAULTS.wash_delivery_to_inspection);
  const washInHouse = subDays(washDelivery, BACKWARD_DEFAULTS.wash_in_house_to_wash_delivery);
  const washOut = subDays(washInHouse, BACKWARD_DEFAULTS.wash_out_to_wash_in_house);
  const sewComplete = subDays(washOut, BACKWARD_DEFAULTS.sew_complete_to_wash_out);
  const planSew = subDays(sewComplete, BACKWARD_DEFAULTS.plan_sew_to_sew_complete);
  const planCut = subDays(planSew, BACKWARD_DEFAULTS.plan_cut_to_plan_sew);

  return {
    plan_cut_date: format(planCut, 'yyyy-MM-dd'),
    plan_sew_date: format(planSew, 'yyyy-MM-dd'),
    sew_complete_date: format(sewComplete, 'yyyy-MM-dd'),
    wash_out_date: format(washOut, 'yyyy-MM-dd'),
    wash_in_house_date: format(washInHouse, 'yyyy-MM-dd'),
    wash_delivery_date: format(washDelivery, 'yyyy-MM-dd'),
    inspection_date: format(inspection, 'yyyy-MM-dd'),
    ship_date: format(d, 'yyyy-MM-dd'),
  };
}

const INITIAL_FORM = {
  style_id: '', shipment_id: '', line_id: '',
  order_qty: 0, plan_cut_date: '', plan_sew_date: '',
  sew_complete_date: '', wash_out_date: '', wash_in_house_date: '',
  wash_delivery_date: '', wash_type: 'external',
  inspection_date: '', ship_date: '', delivery_date: '',
  sew_complete_qty: 0, target_per_day: 0, planned_days: 0,
  remarks: '', status: 'planned',
};

export function SeasonPlanTab({ factoryId, department }: SeasonPlanTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date();
  const seasonEnd = format(addMonths(today, 4), 'yyyy-MM-dd');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const { data: shipments = [] } = useQuery({
    queryKey: ['season-shipments-crud', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('shipments')
        .select('*, styles(style_no, buyer, smv)')
        .order('expected_delivery', { ascending: true });
      return data ?? [];
    },
  });

  const { data: seasonEntries = [], isLoading } = useQuery({
    queryKey: ['season-plan-entries', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('season_plan_entries')
        .select('*, styles(style_no, buyer, smv), shipments(order_ref, buyer, quantity, status, expected_delivery), lines(line_number, floors(name))')
        .order('ship_date', { ascending: true });
      return data ?? [];
    },
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-season'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv').order('style_no');
      return data ?? [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['season-lines', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data } = await supabase.from('lines').select('id, line_number, floors(name)').eq('is_active', true).eq('type', department).in('floor_id', floors.map(f => f.id)).order('line_number');
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const seasonData = useMemo(() => {
    return (seasonEntries as any[]).map(e => ({
      id: e.id,
      style: e.styles?.style_no || '',
      buyer: e.styles?.buyer || e.shipments?.buyer || '',
      orderRef: e.shipments?.order_ref || '',
      orderQty: e.order_qty,
      lineNo: e.lines ? `L${e.lines.line_number}` : '—',
      planCutDate: e.plan_cut_date,
      planSewDate: e.plan_sew_date,
      sewCompleteDate: e.sew_complete_date,
      washOutDate: e.wash_out_date,
      washInHouseDate: e.wash_in_house_date,
      washDeliveryDate: e.wash_delivery_date,
      washType: e.wash_type || 'external',
      inspectionDate: e.inspection_date,
      shipDate: e.ship_date,
      deliveryDate: e.delivery_date,
      sewCompleteQty: e.sew_complete_qty,
      targetPerDay: e.target_per_day,
      plannedDays: e.planned_days,
      status: e.status,
      remarks: e.remarks,
      daysToShip: e.ship_date ? differenceInDays(parseISO(e.ship_date), today) : 999,
    })).sort((a, b) => a.daysToShip - b.daysToShip);
  }, [seasonEntries]);

  const urgentOrders = seasonData.filter(s => s.daysToShip <= 30 && s.status !== 'completed');

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Backward planning: when delivery_date changes, auto-calculate all dates
      if (field === 'delivery_date' && value) {
        const dates = calcBackwardDates(value);
        return { ...updated, ...dates };
      }
      return updated;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setDialogOpen(true);
  };

  const openEdit = (entry: any) => {
    setEditingId(entry.id);
    const raw = (seasonEntries as any[]).find(e => e.id === entry.id);
    if (raw) {
      setFormData({
        style_id: raw.style_id || '',
        shipment_id: raw.shipment_id || '',
        line_id: raw.line_id || '',
        order_qty: raw.order_qty,
        plan_cut_date: raw.plan_cut_date || '',
        plan_sew_date: raw.plan_sew_date || '',
        sew_complete_date: raw.sew_complete_date || '',
        wash_out_date: raw.wash_out_date || '',
        wash_in_house_date: raw.wash_in_house_date || '',
        wash_delivery_date: raw.wash_delivery_date || '',
        wash_type: raw.wash_type || 'external',
        inspection_date: raw.inspection_date || '',
        ship_date: raw.ship_date || '',
        delivery_date: raw.delivery_date || '',
        sew_complete_qty: raw.sew_complete_qty,
        target_per_day: raw.target_per_day,
        planned_days: raw.planned_days,
        remarks: raw.remarks || '',
        status: raw.status,
      });
    }
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.style_id) throw new Error('Select a style');
      const payload = {
        factory_id: factoryId || null,
        style_id: formData.style_id,
        shipment_id: formData.shipment_id || null,
        line_id: formData.line_id || null,
        order_qty: formData.order_qty,
        plan_cut_date: formData.plan_cut_date || null,
        plan_sew_date: formData.plan_sew_date || null,
        sew_complete_date: formData.sew_complete_date || null,
        wash_out_date: formData.wash_out_date || null,
        wash_in_house_date: formData.wash_in_house_date || null,
        wash_delivery_date: formData.wash_delivery_date || null,
        wash_type: formData.wash_type,
        inspection_date: formData.inspection_date || null,
        ship_date: formData.ship_date || null,
        delivery_date: formData.delivery_date || null,
        sew_complete_qty: formData.sew_complete_qty,
        target_per_day: formData.target_per_day,
        planned_days: formData.planned_days,
        remarks: formData.remarks || null,
        status: formData.status,
      };
      if (editingId) {
        const { error } = await supabase.from('season_plan_entries').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('season_plan_entries').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-plan-entries'] });
      toast.success(editingId ? 'Entry updated' : 'Entry created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('season_plan_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-plan-entries'] });
      toast.success('Entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = () => {
    const rows = seasonData.map(s => ({
      Style: s.style, Buyer: s.buyer, 'Order Ref': s.orderRef, Line: s.lineNo,
      'Order Qty': s.orderQty,
      'Plan Cut Date': s.planCutDate || '', 'Plan Sew Date': s.planSewDate || '',
      'Sew Complete Date': s.sewCompleteDate || '',
      'Wash Out Date': s.washOutDate || '', 'Wash In-House Date': s.washInHouseDate || '',
      'Wash Delivery Date': s.washDeliveryDate || '', 'Wash Type': s.washType,
      'Inspection Date': s.inspectionDate || '', 'Ship Date': s.shipDate || '',
      'Delivery Date': s.deliveryDate || '',
      'Sew Complete Qty': s.sewCompleteQty, 'Target/Day': s.targetPerDay,
      'Planned Days': s.plannedDays, Status: s.status, Remarks: s.remarks || '',
    }));
    exportToExcel(rows, `season_plan_${format(today, 'yyyy-MM')}`, 'Season Plan');
    toast.success('Exported season plan');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) { toast.error('Empty file'); return; }
      const styleMap = new Map(styles.map(s => [s.style_no, s]));
      const lineMap = new Map((lines as any[]).map(l => [`L${l.line_number}`, l]));
      const entries = rows.map((r: any) => {
        const style = styleMap.get(r.Style);
        if (!style) return null;
        const line = lineMap.get(r.Line);
        return {
          factory_id: factoryId || null, style_id: style.id,
          line_id: line ? (line as any).id : null,
          order_qty: Number(r['Order Qty']) || 0,
          plan_cut_date: r['Plan Cut Date'] || null, plan_sew_date: r['Plan Sew Date'] || null,
          sew_complete_date: r['Sew Complete Date'] || null,
          wash_out_date: r['Wash Out Date'] || null, wash_in_house_date: r['Wash In-House Date'] || null,
          wash_delivery_date: r['Wash Delivery Date'] || null, wash_type: r['Wash Type'] || 'external',
          inspection_date: r['Inspection Date'] || null, ship_date: r['Ship Date'] || null,
          delivery_date: r['Delivery Date'] || null,
          sew_complete_qty: Number(r['Sew Complete Qty']) || 0,
          target_per_day: Number(r['Target/Day']) || 0,
          planned_days: Number(r['Planned Days']) || 0,
          remarks: r.Remarks || null, status: r.Status || 'planned',
        };
      }).filter(Boolean);
      if (!entries.length) { toast.error('No valid rows. Check Style column.'); return; }
      const { error } = await supabase.from('season_plan_entries').insert(entries);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['season-plan-entries'] });
      toast.success(`Imported ${entries.length} season entries`);
    } catch (err: any) { toast.error(err.message); }
    e.target.value = '';
  };

  const statusColors: Record<string, string> = {
    planned: 'bg-muted text-muted-foreground',
    cutting: 'bg-primary/15 text-primary border-primary/30',
    sewing: 'bg-accent/15 text-accent border-accent/30',
    washing: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    finishing: 'bg-warning/15 text-warning border-warning/30',
    completed: 'bg-success/15 text-success border-success/30',
    delayed: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Season Window', value: `${format(today, 'MMM')} – ${format(addMonths(today, 3), 'MMM yyyy')}`, icon: CalendarDays, color: 'text-primary' },
          { label: 'Total Entries', value: String(seasonData.length), icon: Target, color: 'text-success' },
          { label: 'Urgent (≤30d)', value: String(urgentOrders.length), icon: AlertTriangle, color: 'text-destructive' },
          { label: 'On Track', value: String(seasonData.length - urgentOrders.length), icon: CheckCircle2, color: 'text-success' },
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" /> Season Plan — PCD → Sew → Wash → Inspection → Ship
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(['Style', 'Line', 'Order Qty', 'Delivery Date', 'Plan Cut Date', 'Plan Sew Date', 'Sew Complete Date', 'Wash Out Date', 'Wash In-House Date', 'Wash Delivery Date', 'Wash Type', 'Inspection Date', 'Ship Date', 'Sew Complete Qty', 'Target/Day', 'Planned Days', 'Status', 'Remarks'], 'season_plan')} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 h-7">
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!seasonData.length} className="gap-1.5 h-7">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Style', 'Buyer', 'Line', 'Order Qty', 'PCD', 'PSD', 'Sew Comp', 'Wash Out', 'Wash In', 'Wash Del', 'Inspect', 'Ship', 'Days Left', 'Sew Qty', 'Tgt/Day', 'Status', ''].map(h => (
                    <th key={h} className={`py-2 px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['Order Qty', 'Days Left', 'Sew Qty', 'Tgt/Day'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={17} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : seasonData.length === 0 ? (
                  <tr><td colSpan={17} className="py-12 text-center text-muted-foreground">
                    No season plan entries. Click <strong>"Add Entry"</strong> to create one with backward planning from delivery date.
                  </td></tr>
                ) : seasonData.map((item) => {
                  const urgencyColor = item.daysToShip <= 14 ? 'text-destructive font-bold' : item.daysToShip <= 30 ? 'text-warning font-bold' : 'text-foreground';
                  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'MMM d') : '—';
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-1.5 font-medium text-foreground">{item.style}</td>
                      <td className="py-2 px-1.5 text-muted-foreground text-[10px]">{item.buyer}</td>
                      <td className="py-2 px-1.5">{item.lineNo}</td>
                      <td className="py-2 px-1.5 text-right font-bold">{item.orderQty.toLocaleString()}</td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(item.planCutDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(item.planSewDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(item.sewCompleteDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(item.washOutDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(item.washInHouseDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-blue-600 text-[10px]">{fmtDate(item.washDeliveryDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-muted-foreground text-[10px]">{fmtDate(item.inspectionDate)}</td>
                      <td className="py-2 px-1.5 font-mono text-foreground font-medium text-[10px]">{fmtDate(item.shipDate)}</td>
                      <td className={`py-2 px-1.5 text-right ${urgencyColor}`}>{item.daysToShip < 999 ? `${item.daysToShip}d` : '—'}</td>
                      <td className="py-2 px-1.5 text-right">{item.sewCompleteQty > 0 ? item.sewCompleteQty.toLocaleString() : '—'}</td>
                      <td className="py-2 px-1.5 text-right">{item.targetPerDay > 0 ? item.targetPerDay.toLocaleString() : '—'}</td>
                      <td className="py-2 px-1.5 text-center">
                        <Badge variant="outline" className={`text-[8px] capitalize ${statusColors[item.status] || ''}`}>{item.status}</Badge>
                      </td>
                      <td className="py-2 px-1.5">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                                <AlertDialogDescription>Delete season plan entry for {item.style}?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Add/Edit Dialog with Backward Planning */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Season Entry' : 'Add Season Entry'}</DialogTitle>
            <DialogDescription>
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Set the <strong>Delivery Date</strong> first — all dates will auto-calculate backward. Adjust as needed.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Core info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold">Style *</Label>
                <Select value={formData.style_id} onValueChange={v => updateField('style_id', v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select style" /></SelectTrigger>
                  <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Shipment (optional)</Label>
                <Select value={formData.shipment_id} onValueChange={v => updateField('shipment_id', v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Link to shipment" /></SelectTrigger>
                  <SelectContent>{(shipments as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.order_ref} — {s.buyer}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Line (optional)</Label>
                <Select value={formData.line_id} onValueChange={v => updateField('line_id', v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Assign line" /></SelectTrigger>
                  <SelectContent>{(lines as any[]).map(l => <SelectItem key={l.id} value={l.id}>L{l.line_number} — {l.floors?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Order Qty</Label>
                <Input type="number" className="h-8" value={formData.order_qty} onChange={e => updateField('order_qty', Number(e.target.value))} />
              </div>
            </div>

            {/* Delivery Date — the anchor for backward planning */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-primary">📅 Delivery Date (anchor for backward planning)</Label>
                    <Input type="date" className="h-8 mt-1 border-primary/30" value={formData.delivery_date} onChange={e => updateField('delivery_date', e.target.value)} />
                  </div>
                  <div className="text-[10px] text-muted-foreground max-w-[200px]">
                    Setting this will auto-calculate: PCD, PSD, Sew Complete, Wash dates, Inspection, Ship Date
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline dates — auto-filled but editable */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Production Timeline</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Plan Cut Date (PCD)</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.plan_cut_date} onChange={e => updateField('plan_cut_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Plan Sew Date (PSD)</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.plan_sew_date} onChange={e => updateField('plan_sew_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Sew Complete Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.sew_complete_date} onChange={e => updateField('sew_complete_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Ship Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.ship_date} onChange={e => updateField('ship_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Wash dates */}
            <div>
              <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">🧺 Washing Schedule</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Wash Type</Label>
                  <Select value={formData.wash_type} onValueChange={v => updateField('wash_type', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="in_house">In-House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Wash Out Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_out_date} onChange={e => updateField('wash_out_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Wash In-House Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_in_house_date} onChange={e => updateField('wash_in_house_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Wash Delivery Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_delivery_date} onChange={e => updateField('wash_delivery_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Inspection & quantities */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Inspection & Quantities</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Inspection Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.inspection_date} onChange={e => updateField('inspection_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Sew Complete Qty</Label>
                  <Input type="number" className="h-7 text-xs" value={formData.sew_complete_qty} onChange={e => updateField('sew_complete_qty', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Target Per Day</Label>
                  <Input type="number" className="h-7 text-xs" value={formData.target_per_day} onChange={e => updateField('target_per_day', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Planned Days</Label>
                  <Input type="number" className="h-7 text-xs" value={formData.planned_days} onChange={e => updateField('planned_days', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Status & remarks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={formData.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['planned', 'cutting', 'sewing', 'washing', 'finishing', 'completed', 'delayed'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Remarks</Label>
                <Input className="h-8" value={formData.remarks} onChange={e => updateField('remarks', e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
