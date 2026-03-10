import { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const BACKWARD_DEFAULTS = {
  inspection_to_delivery: 3,
  wash_delivery_to_inspection: 2,
  wash_in_house_to_wash_delivery: 3,
  wash_out_to_wash_in_house: 5,
  sew_complete_to_wash_out: 2,
  plan_sew_to_sew_complete: 15,
  plan_cut_to_plan_sew: 5,
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
  style_id: '', shipment_id: '', line_id: '', order_id: '',
  order_qty: 0, cut_qty: 0, plan_cut_date: '', plan_sew_date: '',
  sew_complete_date: '', wash_out_date: '', wash_in_house_date: '',
  wash_delivery_date: '', wash_type: 'external',
  inspection_date: '', ship_date: '', delivery_date: '',
  cut_off_date: '', ex_factory_date: '',
  sew_complete_qty: 0, sew_balance: 0, target_per_day: 0, planned_days: 0,
  destination: '', wash_plant: '', po_number: '', dpo_number: '',
  remarks: '', status: 'planned',
};

export function SeasonPlanTab({ factoryId, department }: SeasonPlanTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  // Fetch orders for linking
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-for-season', factoryId],
    queryFn: async () => {
      const q = supabase.from('orders').select('*').order('master_style_no');
      if (factoryId) q.eq('factory_id', factoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: seasonEntries = [], isLoading } = useQuery({
    queryKey: ['season-plan-entries', factoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('season_plan_entries')
        .select('*, styles(style_no, buyer, smv), lines(line_number, floors(name)), orders!season_plan_entries_order_id_fkey(season, master_style_no, style_description, bom, bom_cc_description, color_description, market, channel, po_number, dpo_number, confirmed_units, ship_cancel_date, factory_id, factories(name))')
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
    return (seasonEntries as any[]).map(e => {
      const ord = e.orders;
      const orderQty = e.order_qty || ord?.confirmed_units || 0;
      const cutQty = e.cut_qty || Math.ceil(orderQty * 1.05); // +5% allowance
      return {
        id: e.id,
        // From order
        season: ord?.season || '',
        styleDescription: ord?.style_description || '',
        masterStyle: ord?.master_style_no || '',
        style: e.styles?.style_no || '',
        bom: ord?.bom || '',
        color: ord?.color_description || '',
        market: ord?.market || '',
        channel: ord?.channel || '',
        po: e.po_number || ord?.po_number || '',
        dpo: e.dpo_number || ord?.dpo_number || '',
        destination: e.destination || '',
        shipCxl: ord?.ship_cancel_date || null,
        // Quantities
        orderQty,
        cutQty,
        sewCompleteQty: e.sew_complete_qty || 0,
        sewBalance: e.sew_balance || (orderQty - (e.sew_complete_qty || 0)),
        // Dates
        cutOffDate: e.cut_off_date,
        exFactoryDate: e.ex_factory_date,
        planCutDate: e.plan_cut_date,
        planSewDate: e.plan_sew_date,
        sewCompleteDate: e.sew_complete_date,
        washOutDate: e.wash_out_date,
        washInHouseDate: e.wash_in_house_date,
        washDeliveryDate: e.wash_delivery_date,
        washType: e.wash_type || 'external',
        washPlant: e.wash_plant || '',
        inspectionDate: e.inspection_date,
        shipDate: e.ship_date,
        deliveryDate: e.delivery_date,
        // Meta
        lineNo: e.lines ? `L${e.lines.line_number}` : '—',
        targetPerDay: e.target_per_day,
        plannedDays: e.planned_days,
        status: e.status,
        remarks: e.remarks,
        daysToShip: e.ship_date ? differenceInDays(parseISO(e.ship_date), today) : 999,
        buyer: e.styles?.buyer || '',
      };
    }).sort((a, b) => a.daysToShip - b.daysToShip);
  }, [seasonEntries]);

  const urgentOrders = seasonData.filter(s => s.daysToShip <= 30 && s.status !== 'completed');

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'delivery_date' && value) {
        const dates = calcBackwardDates(value);
        return { ...updated, ...dates };
      }
      // When order is selected, auto-fill fields from order
      if (field === 'order_id' && value) {
        const order = orders.find((o: any) => o.id === value);
        if (order) {
          return {
            ...updated,
            style_id: order.style_id || updated.style_id,
            order_qty: order.confirmed_units || order.final_quantity || updated.order_qty,
            cut_qty: Math.ceil((order.confirmed_units || order.final_quantity || 0) * 1.05),
            po_number: order.po_number || '',
            dpo_number: order.dpo_number || '',
            destination: '',
          };
        }
      }
      // Auto-calc cut qty when order qty changes
      if (field === 'order_qty') {
        return { ...updated, cut_qty: Math.ceil(Number(value) * 1.05) };
      }
      // Auto-calc sew balance
      if (field === 'sew_complete_qty') {
        return { ...updated, sew_balance: updated.order_qty - Number(value) };
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
        order_id: raw.order_id || '',
        order_qty: raw.order_qty,
        cut_qty: raw.cut_qty || Math.ceil(raw.order_qty * 1.05),
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
        cut_off_date: raw.cut_off_date || '',
        ex_factory_date: raw.ex_factory_date || '',
        sew_complete_qty: raw.sew_complete_qty,
        sew_balance: raw.sew_balance || (raw.order_qty - raw.sew_complete_qty),
        target_per_day: raw.target_per_day,
        planned_days: raw.planned_days,
        destination: raw.destination || '',
        wash_plant: raw.wash_plant || '',
        po_number: raw.po_number || '',
        dpo_number: raw.dpo_number || '',
        remarks: raw.remarks || '',
        status: raw.status,
      });
    }
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.style_id) throw new Error('Select a style');
      const payload: Record<string, any> = {
        factory_id: factoryId || null,
        style_id: formData.style_id,
        shipment_id: formData.shipment_id || null,
        line_id: formData.line_id || null,
        order_id: formData.order_id || null,
        order_qty: formData.order_qty,
        cut_qty: formData.cut_qty,
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
        cut_off_date: formData.cut_off_date || null,
        ex_factory_date: formData.ex_factory_date || null,
        sew_complete_qty: formData.sew_complete_qty,
        sew_balance: formData.sew_balance,
        target_per_day: formData.target_per_day,
        planned_days: formData.planned_days,
        destination: formData.destination,
        wash_plant: formData.wash_plant,
        po_number: formData.po_number,
        dpo_number: formData.dpo_number,
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
      Season: s.season, 'Style Description': s.styleDescription, 'Master Style': s.masterStyle,
      'Style #': s.style, BOM: s.bom, Color: s.color, Market: s.market, Channel: s.channel,
      PO: s.po, DPO: s.dpo, Destination: s.destination,
      'O/Q': s.orderQty, 'Cut Qty @5%': s.cutQty, 'Ship CXL': s.shipCxl || '',
      'Cut Off': s.cutOffDate || '', 'Ex Factory': s.exFactoryDate || '',
      'Sew Status': s.status, 'Sew B/L': s.sewBalance, 'Sew/Com': s.sewCompleteQty,
      'Line No': s.lineNo, 'Sewing Start': s.planSewDate || '', 'Sewing Close': s.sewCompleteDate || '',
      'Wash Plant': s.washPlant, 'PCD': s.planCutDate || '', 'Ship Date': s.shipDate || '',
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
      const entries = (rows as any[]).map((r: any) => {
        const style = styleMap.get(r['Style #']);
        if (!style) return null;
        const line = lineMap.get(r['Line No']);
        const oq = Number(r['O/Q']) || 0;
        return {
          factory_id: factoryId || null, style_id: style.id,
          line_id: line ? (line as any).id : null,
          order_qty: oq,
          cut_qty: Number(r['Cut Qty @5%']) || Math.ceil(oq * 1.05),
          plan_cut_date: r['PCD'] || null, plan_sew_date: r['Sewing Start'] || null,
          sew_complete_date: r['Sewing Close'] || null,
          cut_off_date: r['Cut Off'] || null,
          ex_factory_date: r['Ex Factory'] || null,
          wash_plant: r['Wash Plant'] || '',
          destination: r['Destination'] || '',
          po_number: r['PO'] || '',
          dpo_number: r['DPO'] || '',
          sew_complete_qty: Number(r['Sew/Com']) || 0,
          sew_balance: Number(r['Sew B/L']) || 0,
          ship_date: r['Ship Date'] || null,
          remarks: r.Remarks || null, status: r['Sew Status'] || 'planned',
        };
      }).filter(Boolean);
      if (!entries.length) { toast.error('No valid rows. Check Style # column.'); return; }
      const { error } = await supabase.from('season_plan_entries').insert(entries);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['season-plan-entries'] });
      toast.success(`Imported ${entries.length} season entries`);
    } catch (err: any) { toast.error(err.message); }
    e.target.value = '';
  };

  const statusColors: Record<string, string> = {
    planned: 'bg-muted text-muted-foreground',
    cutting: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    sewing: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    washing: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    finishing: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
    completed: 'bg-emerald-600/15 text-emerald-700 border-emerald-600/30',
    delayed: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'dd-MMM') : '—';

  const TEMPLATE_COLS = ['Season', 'Style Description', 'Master Style', 'Style #', 'BOM', 'Color', 'Market', 'Channel', 'PO', 'DPO', 'Destination', 'O/Q', 'Cut Qty @5%', 'Ship CXL', 'Cut Off', 'Ex Factory', 'Sew Status', 'Sew B/L', 'Sew/Com', 'Line No', 'Sewing Start', 'Sewing Close', 'Wash Plant'];

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: String(seasonData.length), icon: Target, color: 'text-primary' },
          { label: 'Urgent (≤30d)', value: String(urgentOrders.length), icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Total O/Q', value: seasonData.reduce((a, s) => a + s.orderQty, 0).toLocaleString(), icon: Ship, color: 'text-primary' },
          { label: 'On Track', value: String(seasonData.filter(s => s.status !== 'delayed' && s.status !== 'completed').length), icon: CheckCircle2, color: 'text-emerald-600' },
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

      {/* Main Table */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" /> Season Plan
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(TEMPLATE_COLS, 'season_plan')} className="gap-1.5 h-7">
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
                  {['Season', 'Style Desc', 'Master Style', 'Style #', 'BOM', 'Color', 'Market', 'Channel', 'PO', 'DPO', 'Dest', 'O/Q', 'Cut @5%', 'Ship CXL', 'Cut Off', 'Ex Fac', 'Sew Status', 'Sew B/L', 'Sew/Com', 'Line', 'Sew Start', 'Sew Close', 'Wash Plant', ''].map(h => (
                    <th key={h} className={`py-2 px-1.5 text-[8px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['O/Q', 'Cut @5%', 'Sew B/L', 'Sew/Com'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Sew Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={24} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : seasonData.length === 0 ? (
                  <tr><td colSpan={24} className="py-12 text-center text-muted-foreground">
                    No season plan entries. Click <strong>"Add Entry"</strong> to start.
                  </td></tr>
                ) : seasonData.map((item) => {
                  const urgencyColor = item.daysToShip <= 14 ? 'bg-destructive/5' : item.daysToShip <= 30 ? 'bg-amber-500/5' : '';
                  return (
                    <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${urgencyColor}`}>
                      <td className="py-1.5 px-1.5 text-muted-foreground whitespace-nowrap">{item.season || '—'}</td>
                      <td className="py-1.5 px-1.5 max-w-[120px] truncate" title={item.styleDescription}>{item.styleDescription || '—'}</td>
                      <td className="py-1.5 px-1.5 font-medium whitespace-nowrap">{item.masterStyle || '—'}</td>
                      <td className="py-1.5 px-1.5 font-bold text-foreground whitespace-nowrap">{item.style || '—'}</td>
                      <td className="py-1.5 px-1.5 text-muted-foreground">{item.bom || '—'}</td>
                      <td className="py-1.5 px-1.5 text-muted-foreground max-w-[80px] truncate" title={item.color}>{item.color || '—'}</td>
                      <td className="py-1.5 px-1.5">{item.market || '—'}</td>
                      <td className="py-1.5 px-1.5">{item.channel || '—'}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px]">{item.po || '—'}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px]">{item.dpo || '—'}</td>
                      <td className="py-1.5 px-1.5">{item.destination || '—'}</td>
                      <td className="py-1.5 px-1.5 text-right font-bold">{item.orderQty > 0 ? item.orderQty.toLocaleString() : '—'}</td>
                      <td className="py-1.5 px-1.5 text-right font-medium text-amber-700">{item.cutQty > 0 ? item.cutQty.toLocaleString() : '—'}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px] text-destructive font-medium">{fmtDate(item.shipCxl)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px]">{fmtDate(item.cutOffDate)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px]">{fmtDate(item.exFactoryDate)}</td>
                      <td className="py-1.5 px-1.5 text-center">
                        <Badge variant="outline" className={`text-[7px] capitalize ${statusColors[item.status] || ''}`}>{item.status}</Badge>
                      </td>
                      <td className={`py-1.5 px-1.5 text-right font-bold ${item.sewBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {item.sewBalance > 0 ? item.sewBalance.toLocaleString() : item.sewBalance === 0 && item.sewCompleteQty > 0 ? '✓' : '—'}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-medium">{item.sewCompleteQty > 0 ? item.sewCompleteQty.toLocaleString() : '—'}</td>
                      <td className="py-1.5 px-1.5 font-medium">{item.lineNo}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px] text-emerald-700">{fmtDate(item.planSewDate)}</td>
                      <td className="py-1.5 px-1.5 font-mono text-[10px] text-emerald-700">{fmtDate(item.sewCompleteDate)}</td>
                      <td className="py-1.5 px-1.5">{item.washPlant || '—'}</td>
                      <td className="py-1.5 px-1.5">
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

      {/* Gantt Timeline */}
      {seasonData.length > 0 && (
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Visual Timeline — PCD → Sew → Wash → Inspect → Ship
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SeasonGanttChart entries={seasonData} />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Season Entry' : 'Add Season Entry'}</DialogTitle>
            <DialogDescription>
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Link an <strong>Order</strong> to auto-fill details, or set the <strong>Delivery Date</strong> for backward planning.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Link */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-bold text-primary">🔗 Link to Order (auto-fills details)</Label>
                    <Select value={formData.order_id} onValueChange={v => updateField('order_id', v)}>
                      <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select order..." /></SelectTrigger>
                      <SelectContent>
                        {(orders as any[]).map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.master_style_no} — {o.season} — PO: {o.po_number || 'N/A'} ({o.confirmed_units} units)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-primary">📅 Delivery Date</Label>
                    <Input type="date" className="h-8 mt-1 border-primary/30" value={formData.delivery_date} onChange={e => updateField('delivery_date', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Core Identification */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Identification</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Style *</Label>
                  <Select value={formData.style_id} onValueChange={v => updateField('style_id', v)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Line</Label>
                  <Select value={formData.line_id} onValueChange={v => updateField('line_id', v)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Assign line" /></SelectTrigger>
                    <SelectContent>{(lines as any[]).map(l => <SelectItem key={l.id} value={l.id}>L{l.line_number} — {l.floors?.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">PO Number</Label>
                  <Input className="h-8" value={formData.po_number} onChange={e => updateField('po_number', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">DPO Number</Label>
                  <Input className="h-8" value={formData.dpo_number} onChange={e => updateField('dpo_number', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Quantities */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Quantities & Location</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-[10px]">O/Q (Order Qty)</Label>
                  <Input type="number" className="h-8" value={formData.order_qty} onChange={e => updateField('order_qty', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Cut Qty @5%</Label>
                  <Input type="number" className="h-8" value={formData.cut_qty} onChange={e => updateField('cut_qty', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Sew Complete Qty</Label>
                  <Input type="number" className="h-8" value={formData.sew_complete_qty} onChange={e => updateField('sew_complete_qty', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Sew Balance</Label>
                  <Input type="number" className="h-8 bg-muted/50" value={formData.sew_balance} readOnly />
                </div>
                <div>
                  <Label className="text-[10px]">Destination</Label>
                  <Input className="h-8" value={formData.destination} onChange={e => updateField('destination', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Timeline Dates */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Production Timeline</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Plan Cut Date (PCD)</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.plan_cut_date} onChange={e => updateField('plan_cut_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Cut Off Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.cut_off_date} onChange={e => updateField('cut_off_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Sewing Start Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.plan_sew_date} onChange={e => updateField('plan_sew_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Sewing Close Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.sew_complete_date} onChange={e => updateField('sew_complete_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Ex Factory Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.ex_factory_date} onChange={e => updateField('ex_factory_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Ship Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.ship_date} onChange={e => updateField('ship_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Inspection Date</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.inspection_date} onChange={e => updateField('inspection_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Target Per Day</Label>
                  <Input type="number" className="h-7 text-xs" value={formData.target_per_day} onChange={e => updateField('target_per_day', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Wash */}
            <div>
              <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">🧺 Washing</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  <Label className="text-[10px]">Wash Plant</Label>
                  <Input className="h-7 text-xs" value={formData.wash_plant} onChange={e => updateField('wash_plant', e.target.value)} placeholder="e.g. ABC Wash" />
                </div>
                <div>
                  <Label className="text-[10px]">Wash Out</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_out_date} onChange={e => updateField('wash_out_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Wash In-House</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_in_house_date} onChange={e => updateField('wash_in_house_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Wash Delivery</Label>
                  <Input type="date" className="h-7 text-xs" value={formData.wash_delivery_date} onChange={e => updateField('wash_delivery_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Status & Remarks */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                <Label className="text-xs">Planned Days</Label>
                <Input type="number" className="h-8" value={formData.planned_days} onChange={e => updateField('planned_days', Number(e.target.value))} />
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
