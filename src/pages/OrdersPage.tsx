import { useState, useMemo, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ClipboardList, Plus, Pencil, Trash2, Search, Download, Upload,
  Package, Ship, TrendingUp, AlertTriangle, CheckCircle2, Eye, Filter,
  Layers, Calendar as CalendarIcon
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { exportToExcel, parseExcelFile, downloadTemplate } from '@/lib/excel-utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_production: 'bg-accent/15 text-accent border-accent/30',
  washing: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  finishing: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  packed: 'bg-warning/15 text-warning border-warning/30',
  shipped: 'bg-success/15 text-success border-success/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const STATUSES = ['pending', 'confirmed', 'in_production', 'washing', 'finishing', 'packed', 'shipped', 'completed', 'cancelled'];

const INITIAL_FORM = {
  factory_id: '', subcon_name: '', season: '', master_style_no: '', style_id: '',
  style_description: '', bom: '', bom_cc_description: '', color_description: '',
  market: '', channel: '', published_units: 0, confirmed_units: 0, final_quantity: 0,
  shipped_qty: 0, po_number: '', dpo_number: '', dpo_qty: 0,
  trigger_date: '', booking_period: '', ship_cancel_date: '', published_indc_date: '',
  bulk_yy: 0, total_fabric_requirement: 0, rd_number: '', fabric_description: '',
  mill: '', shipment_id: '', status: 'pending', remarks: '',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const factoryId = useFactoryId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', factoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, styles(style_no, buyer, smv), shipments(order_ref, status, quantity, shipped_qty, expected_delivery)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer, smv').order('style_no');
      return data ?? [];
    },
  });

  const { data: factories = [] } = useQuery({
    queryKey: ['factories-for-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('factories').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments-for-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('shipments').select('id, order_ref, buyer, status').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Sync: get season plan entries linked to styles used in orders
  const orderStyleIds = useMemo(() => [...new Set((orders as any[]).map(o => o.style_id).filter(Boolean))], [orders]);

  const { data: seasonEntries = [] } = useQuery({
    queryKey: ['order-season-entries', orderStyleIds],
    queryFn: async () => {
      if (!orderStyleIds.length) return [];
      const { data } = await supabase.from('season_plan_entries').select('style_id, status, plan_cut_date, plan_sew_date, ship_date').in('style_id', orderStyleIds);
      return data ?? [];
    },
    enabled: orderStyleIds.length > 0,
  });

  const seasonByStyle = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of seasonEntries as any[]) {
      const arr = map.get(e.style_id) || [];
      arr.push(e);
      map.set(e.style_id, arr);
    }
    return map;
  }, [seasonEntries]);

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          o.master_style_no?.toLowerCase().includes(term) ||
          o.po_number?.toLowerCase().includes(term) ||
          o.dpo_number?.toLowerCase().includes(term) ||
          o.season?.toLowerCase().includes(term) ||
          o.styles?.style_no?.toLowerCase().includes(term) ||
          o.styles?.buyer?.toLowerCase().includes(term) ||
          o.color_description?.toLowerCase().includes(term) ||
          o.market?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  // KPIs
  const totalOrders = (orders as any[]).length;
  const totalConfirmedUnits = (orders as any[]).reduce((s, o) => s + (o.confirmed_units || 0), 0);
  const totalShippedQty = (orders as any[]).reduce((s, o) => s + (o.shipped_qty || 0), 0);
  const pendingCount = (orders as any[]).filter(o => o.status === 'pending' || o.status === 'confirmed').length;
  const shippedPct = totalConfirmedUnits > 0 ? Math.round((totalShippedQty / totalConfirmedUnits) * 100) : 0;

  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM, factory_id: factoryId || '' });
    setDialogOpen(true);
  };

  const openEdit = (order: any) => {
    setEditingId(order.id);
    setFormData({
      factory_id: order.factory_id || '',
      subcon_name: order.subcon_name || '',
      season: order.season || '',
      master_style_no: order.master_style_no || '',
      style_id: order.style_id || '',
      style_description: order.style_description || '',
      bom: order.bom || '',
      bom_cc_description: order.bom_cc_description || '',
      color_description: order.color_description || '',
      market: order.market || '',
      channel: order.channel || '',
      published_units: order.published_units || 0,
      confirmed_units: order.confirmed_units || 0,
      final_quantity: order.final_quantity || 0,
      shipped_qty: order.shipped_qty || 0,
      po_number: order.po_number || '',
      dpo_number: order.dpo_number || '',
      dpo_qty: order.dpo_qty || 0,
      trigger_date: order.trigger_date || '',
      booking_period: order.booking_period || '',
      ship_cancel_date: order.ship_cancel_date || '',
      published_indc_date: order.published_indc_date || '',
      bulk_yy: Number(order.bulk_yy) || 0,
      total_fabric_requirement: Number(order.total_fabric_requirement) || 0,
      rd_number: order.rd_number || '',
      fabric_description: order.fabric_description || '',
      mill: order.mill || '',
      shipment_id: order.shipment_id || '',
      status: order.status || 'pending',
      remarks: order.remarks || '',
    });
    setDialogOpen(true);
  };

  const openDetail = (order: any) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.master_style_no && !formData.style_id) throw new Error('Enter Master Style # or select a Style');
      const payload = {
        factory_id: formData.factory_id || null,
        subcon_name: formData.subcon_name,
        season: formData.season,
        master_style_no: formData.master_style_no,
        style_id: formData.style_id || null,
        style_description: formData.style_description,
        bom: formData.bom,
        bom_cc_description: formData.bom_cc_description,
        color_description: formData.color_description,
        market: formData.market,
        channel: formData.channel,
        published_units: formData.published_units,
        confirmed_units: formData.confirmed_units,
        final_quantity: formData.final_quantity,
        shipped_qty: formData.shipped_qty,
        po_number: formData.po_number,
        dpo_number: formData.dpo_number,
        dpo_qty: formData.dpo_qty,
        trigger_date: formData.trigger_date || null,
        booking_period: formData.booking_period,
        ship_cancel_date: formData.ship_cancel_date || null,
        published_indc_date: formData.published_indc_date || null,
        bulk_yy: formData.bulk_yy,
        total_fabric_requirement: formData.total_fabric_requirement,
        rd_number: formData.rd_number,
        fabric_description: formData.fabric_description,
        mill: formData.mill,
        shipment_id: formData.shipment_id || null,
        status: formData.status,
        remarks: formData.remarks,
      };
      if (editingId) {
        const { error } = await supabase.from('orders').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('orders').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(editingId ? 'Order updated' : 'Order created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = () => {
    const rows = (orders as any[]).map(o => ({
      'Factory': factories.find(f => f.id === o.factory_id)?.name || '',
      'Subcon': o.subcon_name, 'Season': o.season, 'Master Style #': o.master_style_no,
      'Style #': o.styles?.style_no || '', 'Style Description': o.style_description,
      'BOM': o.bom, 'BOM CC Description': o.bom_cc_description,
      'Color Description': o.color_description, 'Market': o.market, 'Channel': o.channel,
      'Published Units': o.published_units, 'Confirmed Units': o.confirmed_units,
      'Final Quantity': o.final_quantity, 'PO': o.po_number, 'DPO': o.dpo_number,
      'DPO Qty': o.dpo_qty, 'Ship CXL': o.ship_cancel_date || '',
      'Published INDC': o.published_indc_date || '', 'Shipped Qty': o.shipped_qty,
      'Trigger Date': o.trigger_date || '', 'Booking Period': o.booking_period,
      'Bulk YY': o.bulk_yy, 'Total Fabric Req': o.total_fabric_requirement,
      'RD #': o.rd_number, 'Fabric Description': o.fabric_description,
      'Mill': o.mill, 'Status': o.status, 'Remarks': o.remarks,
    }));
    exportToExcel(rows, `orders_${format(new Date(), 'yyyy-MM-dd')}`, 'Orders');
    toast.success('Exported orders');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) { toast.error('Empty file'); return; }
      const styleMap = new Map(styles.map(s => [s.style_no, s]));
      const newOrders = rows.map((r: any) => {
        const style = styleMap.get(r['Style #']);
        return {
          factory_id: factoryId || null,
          subcon_name: r['Subcon'] || '',
          season: r['Season'] || '',
          master_style_no: r['Master Style #'] || '',
          style_id: style?.id || null,
          style_description: r['Style Description'] || '',
          bom: r['BOM'] || '',
          bom_cc_description: r['BOM CC Description'] || '',
          color_description: r['Color Description'] || '',
          market: r['Market'] || '',
          channel: r['Channel'] || '',
          published_units: Number(r['Published Units']) || 0,
          confirmed_units: Number(r['Confirmed Units']) || 0,
          final_quantity: Number(r['Final Quantity']) || 0,
          po_number: r['PO'] || '',
          dpo_number: r['DPO'] || '',
          dpo_qty: Number(r['DPO Qty']) || 0,
          trigger_date: r['Trigger Date'] || null,
          booking_period: r['Booking Period'] || '',
          ship_cancel_date: r['Ship CXL'] || null,
          published_indc_date: r['Published INDC'] || null,
          shipped_qty: Number(r['Shipped Qty']) || 0,
          bulk_yy: Number(r['Bulk YY']) || 0,
          total_fabric_requirement: Number(r['Total Fabric Req']) || 0,
          rd_number: r['RD #'] || '',
          fabric_description: r['Fabric Description'] || '',
          mill: r['Mill'] || '',
          status: r['Status'] || 'pending',
          remarks: r['Remarks'] || '',
        };
      });
      const { error } = await supabase.from('orders').insert(newOrders);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Imported ${newOrders.length} orders`);
    } catch (err: any) { toast.error(err.message); }
    e.target.value = '';
  };

  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'MMM d, yyyy') : '—';

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Order Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track orders from booking to shipment — synced with Planning & Shipments
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => downloadTemplate(
            ['Subcon', 'Season', 'Master Style #', 'Style #', 'Style Description', 'BOM', 'BOM CC Description', 'Color Description', 'Market', 'Channel', 'Published Units', 'Confirmed Units', 'Final Quantity', 'PO', 'DPO', 'DPO Qty', 'Ship CXL', 'Published INDC', 'Shipped Qty', 'Trigger Date', 'Booking Period', 'Bulk YY', 'Total Fabric Req', 'RD #', 'Fabric Description', 'Mill', 'Status', 'Remarks'],
            'orders'
          )} className="gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" /> Template
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 h-8">
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!(orders as any[]).length} className="gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> New Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Orders', value: String(totalOrders), icon: ClipboardList, color: 'text-primary' },
          { label: 'Confirmed Units', value: totalConfirmedUnits.toLocaleString(), icon: CheckCircle2, color: 'text-success' },
          { label: 'Shipped Qty', value: totalShippedQty.toLocaleString(), icon: Ship, color: 'text-accent' },
          { label: 'Pending/Confirmed', value: String(pendingCount), icon: AlertTriangle, color: 'text-warning' },
          { label: 'Ship Achievement', value: `${shippedPct}%`, icon: TrendingUp, color: 'text-primary' },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search style, PO, buyer, season..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filteredOrders.length} of {totalOrders} orders</span>
      </div>

      {/* Orders Table */}
      <Card className="border-[1.5px]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Season', 'Master Style', 'Style #', 'Buyer', 'Color', 'PO', 'DPO', 'Confirmed', 'Final Qty', 'Shipped', 'Ship CXL', 'Market', 'Status', 'Plan', ''].map(h => (
                    <th key={h} className={`py-2 px-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['Confirmed', 'Final Qty', 'Shipped', 'DPO'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' || h === 'Plan' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={15} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={15} className="py-12 text-center text-muted-foreground text-sm">
                    No orders found. Click <strong>"New Order"</strong> to create one or <strong>"Import"</strong> from Excel.
                  </td></tr>
                ) : filteredOrders.map((o: any) => {
                  const shipPct = o.final_quantity > 0 ? Math.min(100, Math.round((o.shipped_qty / o.final_quantity) * 100)) : 0;
                  const hasPlan = seasonByStyle.has(o.style_id);
                  const shipCxlDays = o.ship_cancel_date ? differenceInDays(parseISO(o.ship_cancel_date), new Date()) : null;
                  const urgency = shipCxlDays !== null && shipCxlDays <= 14 ? 'text-destructive font-bold' : shipCxlDays !== null && shipCxlDays <= 30 ? 'text-warning font-bold' : '';

                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(o)}>
                      <td className="py-2 px-2 text-muted-foreground">{o.season || '—'}</td>
                      <td className="py-2 px-2 font-medium text-foreground">{o.master_style_no || '—'}</td>
                      <td className="py-2 px-2 font-bold text-foreground">{o.styles?.style_no || '—'}</td>
                      <td className="py-2 px-2 text-muted-foreground">{o.styles?.buyer || '—'}</td>
                      <td className="py-2 px-2 text-muted-foreground text-[10px]">{o.color_description || '—'}</td>
                      <td className="py-2 px-2 font-mono text-[10px]">{o.po_number || '—'}</td>
                      <td className="py-2 px-2 text-right font-mono text-[10px]">{o.dpo_number || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold">{o.confirmed_units > 0 ? o.confirmed_units.toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-foreground">{o.final_quantity > 0 ? o.final_quantity.toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {o.shipped_qty > 0 && (
                            <>
                              <span className="font-medium">{o.shipped_qty.toLocaleString()}</span>
                              <span className={`text-[9px] font-bold ${shipPct >= 100 ? 'text-success' : 'text-muted-foreground'}`}>({shipPct}%)</span>
                            </>
                          )}
                          {o.shipped_qty === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className={`py-2 px-2 font-mono text-[10px] ${urgency}`}>
                        {o.ship_cancel_date ? format(parseISO(o.ship_cancel_date), 'MMM d') : '—'}
                        {shipCxlDays !== null && shipCxlDays <= 30 && <span className="ml-0.5">({shipCxlDays}d)</span>}
                      </td>
                      <td className="py-2 px-2 text-[10px] text-muted-foreground">{o.market || '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline" className={`text-[8px] capitalize ${STATUS_COLORS[o.status] || ''}`}>
                          {o.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {hasPlan ? (
                          <Badge variant="outline" className="text-[8px] bg-success/10 text-success border-success/30">Synced</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] bg-muted text-muted-foreground">No Plan</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(o)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                <AlertDialogDescription>Delete order {o.master_style_no || o.po_number}?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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

      {/* Detail View Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Order Detail — {selectedOrder.master_style_no || selectedOrder.styles?.style_no}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Season', value: selectedOrder.season },
                    { label: 'Master Style #', value: selectedOrder.master_style_no },
                    { label: 'Style #', value: selectedOrder.styles?.style_no },
                    { label: 'Buyer', value: selectedOrder.styles?.buyer },
                    { label: 'Color', value: selectedOrder.color_description },
                    { label: 'Market', value: selectedOrder.market },
                    { label: 'Channel', value: selectedOrder.channel },
                    { label: 'Status', value: selectedOrder.status?.replace('_', ' ') },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.label}</p>
                      <p className="text-sm font-medium text-foreground capitalize">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Quantities */}
                <Card className="border-[1.5px]">
                  <CardHeader className="pb-1"><CardTitle className="text-xs font-bold">Quantities</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {[
                        { label: 'Published', value: selectedOrder.published_units },
                        { label: 'Confirmed', value: selectedOrder.confirmed_units },
                        { label: 'Final Qty', value: selectedOrder.final_quantity },
                        { label: 'DPO Qty', value: selectedOrder.dpo_qty },
                        { label: 'Shipped', value: selectedOrder.shipped_qty },
                        { label: 'Balance', value: Math.max(0, (selectedOrder.final_quantity || 0) - (selectedOrder.shipped_qty || 0)) },
                      ].map(q => (
                        <div key={q.label} className="text-center">
                          <p className="text-lg font-extrabold text-foreground">{(q.value || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{q.label}</p>
                        </div>
                      ))}
                    </div>
                    {selectedOrder.final_quantity > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Shipment Progress</span>
                          <span className="font-bold">{Math.round(((selectedOrder.shipped_qty || 0) / selectedOrder.final_quantity) * 100)}%</span>
                        </div>
                        <Progress value={Math.min(100, Math.round(((selectedOrder.shipped_qty || 0) / selectedOrder.final_quantity) * 100))} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* PO & Dates */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'PO Number', value: selectedOrder.po_number },
                    { label: 'DPO Number', value: selectedOrder.dpo_number },
                    { label: 'Trigger Date', value: fmtDate(selectedOrder.trigger_date) },
                    { label: 'Booking Period', value: selectedOrder.booking_period },
                    { label: 'Ship Cancel Date', value: fmtDate(selectedOrder.ship_cancel_date) },
                    { label: 'Published INDC', value: fmtDate(selectedOrder.published_indc_date) },
                    { label: 'Subcon', value: selectedOrder.subcon_name },
                    { label: 'BOM', value: selectedOrder.bom },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.label}</p>
                      <p className="text-sm font-medium text-foreground">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Fabric */}
                <Card className="border-[1.5px]">
                  <CardHeader className="pb-1"><CardTitle className="text-xs font-bold">Fabric Details</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Bulk YY', value: selectedOrder.bulk_yy },
                        { label: 'Total Fabric Req', value: selectedOrder.total_fabric_requirement },
                        { label: 'RD #', value: selectedOrder.rd_number },
                        { label: 'Fabric', value: selectedOrder.fabric_description },
                        { label: 'Mill', value: selectedOrder.mill },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.label}</p>
                          <p className="text-sm font-medium text-foreground">{f.value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Planning Sync Status */}
                <Card className="border-[1.5px]">
                  <CardHeader className="pb-1"><CardTitle className="text-xs font-bold">Planning Sync</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    {selectedOrder.style_id && seasonByStyle.has(selectedOrder.style_id) ? (
                      <div className="space-y-2">
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">✓ Linked to Season Plan</Badge>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {seasonByStyle.get(selectedOrder.style_id)!.map((e: any, i: number) => (
                            <div key={i} className="text-[10px] border rounded p-2">
                              <p><strong>PCD:</strong> {e.plan_cut_date ? format(parseISO(e.plan_cut_date), 'MMM d') : '—'}</p>
                              <p><strong>PSD:</strong> {e.plan_sew_date ? format(parseISO(e.plan_sew_date), 'MMM d') : '—'}</p>
                              <p><strong>Ship:</strong> {e.ship_date ? format(parseISO(e.ship_date), 'MMM d') : '—'}</p>
                              <Badge variant="outline" className="text-[7px] mt-1 capitalize">{e.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Badge variant="outline" className="bg-muted text-muted-foreground">No Season Plan Linked</Badge>
                        <p className="text-xs text-muted-foreground mt-2">Create a Season Plan entry for this style to sync planning dates.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedOrder.remarks && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remarks</p>
                    <p className="text-sm text-foreground">{selectedOrder.remarks}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
                <Button onClick={() => { setDetailDialogOpen(false); openEdit(selectedOrder); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Order
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Order' : 'New Order'}</DialogTitle>
            <DialogDescription>Enter order details. Fields marked * are required.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Core identification */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Order Identification</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Factory</Label>
                  <Select value={formData.factory_id} onValueChange={v => updateField('factory_id', v)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select factory" /></SelectTrigger>
                    <SelectContent>{factories.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Subcon (if any)</Label>
                  <Input className="h-8" value={formData.subcon_name} onChange={e => updateField('subcon_name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Season *</Label>
                  <Input className="h-8" value={formData.season} onChange={e => updateField('season', e.target.value)} placeholder="e.g. SS25, FW25" />
                </div>
                <div>
                  <Label className="text-[10px]">Booking Period</Label>
                  <Input className="h-8" value={formData.booking_period} onChange={e => updateField('booking_period', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Style details */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Style Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Master Style # *</Label>
                  <Input className="h-8" value={formData.master_style_no} onChange={e => updateField('master_style_no', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Style # (link)</Label>
                  <Select value={formData.style_id} onValueChange={v => updateField('style_id', v)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Link to style" /></SelectTrigger>
                    <SelectContent>{styles.map(s => <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Style Description</Label>
                  <Input className="h-8" value={formData.style_description} onChange={e => updateField('style_description', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Color Description</Label>
                  <Input className="h-8" value={formData.color_description} onChange={e => updateField('color_description', e.target.value)} />
                </div>
              </div>
            </div>

            {/* BOM & Market */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">BOM & Market</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">BOM</Label>
                  <Input className="h-8" value={formData.bom} onChange={e => updateField('bom', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">BOM CC Description</Label>
                  <Input className="h-8" value={formData.bom_cc_description} onChange={e => updateField('bom_cc_description', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Market</Label>
                  <Input className="h-8" value={formData.market} onChange={e => updateField('market', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Channel</Label>
                  <Input className="h-8" value={formData.channel} onChange={e => updateField('channel', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Quantities */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Quantities</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px]">Published Units</Label>
                  <Input type="number" className="h-8" value={formData.published_units || ''} onChange={e => updateField('published_units', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Confirmed Units</Label>
                  <Input type="number" className="h-8" value={formData.confirmed_units || ''} onChange={e => updateField('confirmed_units', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Final Quantity</Label>
                  <Input type="number" className="h-8" value={formData.final_quantity || ''} onChange={e => updateField('final_quantity', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Shipped Qty</Label>
                  <Input type="number" className="h-8" value={formData.shipped_qty || ''} onChange={e => updateField('shipped_qty', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* PO & DPO */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">PO & DPO</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">PO Number</Label>
                  <Input className="h-8" value={formData.po_number} onChange={e => updateField('po_number', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">DPO Number</Label>
                  <Input className="h-8" value={formData.dpo_number} onChange={e => updateField('dpo_number', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">DPO Qty</Label>
                  <Input type="number" className="h-8" value={formData.dpo_qty || ''} onChange={e => updateField('dpo_qty', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Key Dates</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Trigger Date</Label>
                  <Input type="date" className="h-8" value={formData.trigger_date} onChange={e => updateField('trigger_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Ship Cancel Date (CXL)</Label>
                  <Input type="date" className="h-8" value={formData.ship_cancel_date} onChange={e => updateField('ship_cancel_date', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Published INDC</Label>
                  <Input type="date" className="h-8" value={formData.published_indc_date} onChange={e => updateField('published_indc_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Fabric */}
            <div>
              <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">🧵 Fabric Details</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-[10px]">Bulk YY</Label>
                  <Input type="number" step="0.01" className="h-8" value={formData.bulk_yy || ''} onChange={e => updateField('bulk_yy', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Total Fabric Req</Label>
                  <Input type="number" step="0.01" className="h-8" value={formData.total_fabric_requirement || ''} onChange={e => updateField('total_fabric_requirement', Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">RD #</Label>
                  <Input className="h-8" value={formData.rd_number} onChange={e => updateField('rd_number', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Fabric Description</Label>
                  <Input className="h-8" value={formData.fabric_description} onChange={e => updateField('fabric_description', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px]">Mill</Label>
                  <Input className="h-8" value={formData.mill} onChange={e => updateField('mill', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Status & Shipment Link */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px]">Status</Label>
                <Select value={formData.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Link to Shipment</Label>
                <Select value={formData.shipment_id} onValueChange={v => updateField('shipment_id', v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{(shipments as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.order_ref} — {s.buyer}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Remarks</Label>
                <Input className="h-8" value={formData.remarks} onChange={e => updateField('remarks', e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
