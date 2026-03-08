import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveFilter } from '@/hooks/useActiveFilter';
import { Ship, Package, AlertTriangle, CheckCircle, Clock, Truck, MapPin, Download, Printer, Plus, Pencil, Trash2, Eye, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ShipmentStatus = 'pending' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'delayed';

interface Shipment {
  id: string;
  order_ref: string;
  buyer: string;
  style_id: string | null;
  destination: string;
  quantity: number;
  packed_qty: number;
  shipped_qty: number;
  status: ShipmentStatus;
  ship_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  carrier: string | null;
  tracking_number: string | null;
  delay_reason: string | null;
  delay_days: number;
  production_complete_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  factory_id: string | null;
  remarks: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; icon: typeof Ship }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  packed: { label: 'Packed', color: 'bg-primary/10 text-primary', icon: Package },
  dispatched: { label: 'Dispatched', color: 'bg-purple/10 text-purple', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-warning/10 text-warning', icon: Ship },
  delivered: { label: 'Delivered', color: 'bg-success/10 text-success', icon: CheckCircle },
  delayed: { label: 'Delayed', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const TIMELINE_STEPS = [
  { key: 'production_complete_at', label: 'Production' },
  { key: 'packed_at', label: 'Packed' },
  { key: 'dispatched_at', label: 'Dispatched' },
  { key: 'in_transit_at', label: 'In Transit' },
  { key: 'delivered_at', label: 'Delivered' },
] as const;

function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const completedSteps = TIMELINE_STEPS.filter(s => shipment[s.key as keyof Shipment] !== null).length;
  return (
    <div className="flex items-center gap-1 w-full">
      {TIMELINE_STEPS.map((step, i) => {
        const done = shipment[step.key as keyof Shipment] !== null;
        const ts = shipment[step.key as keyof Shipment] as string | null;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${done ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'}`} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{step.label}</span>
              {ts && <span className="text-[10px] text-muted-foreground/60">{format(new Date(ts), 'dd MMM')}</span>}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${completedSteps > i + 1 ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PackingListPrint({ shipment }: { shipment: Shipment }) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Packing List - ${shipment.order_ref}</title>
      <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body><h1>Packing List</h1><p>${shipment.order_ref}</p>
      <table><tr><th>Field</th><th>Details</th></tr>
      <tr><td>Buyer</td><td>${shipment.buyer}</td></tr>
      <tr><td>Destination</td><td>${shipment.destination}</td></tr>
      <tr><td>Total Qty</td><td>${shipment.quantity.toLocaleString()}</td></tr>
      <tr><td>Packed Qty</td><td>${shipment.packed_qty.toLocaleString()}</td></tr>
      <tr><td>Shipped Qty</td><td>${shipment.shipped_qty.toLocaleString()}</td></tr>
      <tr><td>Status</td><td>${STATUS_CONFIG[shipment.status].label}</td></tr>
      </table></body></html>`);
    win.document.close();
    win.print();
  };
  return <Button variant="ghost" size="sm" onClick={handlePrint} className="h-7 px-2"><Printer className="h-3.5 w-3.5" /></Button>;
}

interface ShipmentForm {
  order_ref: string; buyer: string; destination: string; quantity: number;
  packed_qty: number; shipped_qty: number; status: ShipmentStatus;
  ship_date: string; expected_delivery: string; carrier: string;
  tracking_number: string; delay_reason: string; delay_days: number; remarks: string;
}

const emptyForm: ShipmentForm = {
  order_ref: '', buyer: '', destination: '', quantity: 0,
  packed_qty: 0, shipped_qty: 0, status: 'pending',
  ship_date: '', expected_delivery: '', carrier: '',
  tracking_number: '', delay_reason: '', delay_days: 0, remarks: '',
};

export default function ShipmentsPage() {
  const activeFilter = useActiveFilter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentForm>({ ...emptyForm });

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shipments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Shipment[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_ref: form.order_ref, buyer: form.buyer, destination: form.destination,
        quantity: form.quantity, packed_qty: form.packed_qty, shipped_qty: form.shipped_qty,
        status: form.status as ShipmentStatus,
        ship_date: form.ship_date || null, expected_delivery: form.expected_delivery || null,
        carrier: form.carrier || null, tracking_number: form.tracking_number || null,
        delay_reason: form.delay_reason || null, delay_days: form.delay_days,
        remarks: form.remarks || null,
      };
      if (editId) {
        const { error } = await supabase.from('shipments').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipments').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      toast.success(editId ? 'Shipment updated' : 'Shipment created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (s: Shipment) => {
    setEditId(s.id);
    setForm({
      order_ref: s.order_ref, buyer: s.buyer, destination: s.destination,
      quantity: s.quantity, packed_qty: s.packed_qty, shipped_qty: s.shipped_qty,
      status: s.status, ship_date: s.ship_date || '', expected_delivery: s.expected_delivery || '',
      carrier: s.carrier || '', tracking_number: s.tracking_number || '',
      delay_reason: s.delay_reason || '', delay_days: s.delay_days, remarks: s.remarks || '',
    });
    setDialogOpen(true);
  };

  const filtered = shipments.filter(s => {
    if (activeFilter === 'sh-delayed') return s.status === 'delayed';
    if (activeFilter === 'sh-intransit') return s.status === 'in_transit';
    if (activeFilter === 'sh-delivered') return s.status === 'delivered';
    if (activeFilter === 'sh-pending') return s.status === 'pending' || s.status === 'packed';
    if (activeFilter === 'sh-gap') return s.buyer === 'Gap';
    if (activeFilter === 'sh-lager157') return s.buyer === 'Lager 157';
    if (activeFilter === 'sh-ucb') return s.buyer === 'UCB';
    if (activeFilter === 'sh-zxy') return s.buyer === 'ZXY';
    if (activeFilter === 'sh-cubus') return s.buyer === 'Cubus';
    return true;
  });

  const totalShipments = shipments.length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const delayed = shipments.filter(s => s.status === 'delayed').length;
  const onTimeRate = totalShipments > 0 ? Math.round((delivered / Math.max(delivered + delayed, 1)) * 100) : 0;
  const shippedQty = shipments.reduce((s, r) => s + r.shipped_qty, 0);
  const totalQty = shipments.reduce((s, r) => s + r.quantity, 0);

  const handleExportCSV = () => {
    const headers = ['Order Ref', 'Buyer', 'Destination', 'Qty', 'Packed', 'Shipped', 'Status', 'Ship Date', 'Expected', 'Carrier', 'Tracking #'];
    const rows = filtered.map(s => [s.order_ref, s.buyer, s.destination, s.quantity, s.packed_qty, s.shipped_qty, STATUS_CONFIG[s.status].label, s.ship_date || '', s.expected_delivery || '', s.carrier || '', s.tracking_number || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `shipments-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (field: keyof ShipmentForm, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Shipment Status</h1>
            <p className="text-xs text-muted-foreground">Track orders from production to delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          <TabsList>
            <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
            <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: totalShipments, color: 'text-foreground' },
            { label: 'Delivered', value: delivered, color: 'text-success' },
            { label: 'In Transit', value: inTransit, color: 'text-warning' },
            { label: 'Delayed', value: delayed, color: 'text-destructive' },
            { label: 'On-Time Rate', value: `${onTimeRate}%`, color: 'text-primary' },
            { label: 'Shipped', value: `${shippedQty.toLocaleString()} pcs`, color: 'text-foreground' },
          ].map(s => (
            <Card key={s.label} className="border-[1.5px]">
              <CardContent className="p-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delay Alerts */}
        {delayed > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Delay Alerts ({delayed})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {shipments.filter(s => s.status === 'delayed').map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-background rounded-md p-2 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">{s.delay_days}d late</Badge>
                    <span className="font-medium text-foreground">{s.order_ref}</span>
                    <span className="text-muted-foreground">• {s.buyer}</span>
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{s.destination}</span>
                  </div>
                  <span className="text-xs text-destructive/80">{s.delay_reason}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Shipment Table */}
        <Card className="border-[1.5px]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Buyer</TableHead>
                  <TableHead className="text-xs">Destination</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Packed</TableHead>
                  <TableHead className="text-xs text-right">Shipped</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Ship Date</TableHead>
                  <TableHead className="text-xs">ETA</TableHead>
                  <TableHead className="text-xs w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">No shipments found</TableCell></TableRow>
                ) : filtered.map(s => {
                  const cfg = STATUS_CONFIG[s.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-medium">{s.order_ref}</TableCell>
                      <TableCell className="text-xs">{s.buyer}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.destination}</TableCell>
                      <TableCell className="text-xs text-right">{s.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right">{s.packed_qty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right">{s.shipped_qty.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`${cfg.color} text-xs gap-1`}><Icon className="h-3 w-3" />{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.ship_date ? format(new Date(s.ship_date), 'dd MMM') : '—'}</TableCell>
                      <TableCell className="text-xs">{s.expected_delivery ? format(new Date(s.expected_delivery), 'dd MMM') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          <PackingListPrint shipment={s} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Timeline View */}
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Timeline View</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="rounded-xl border border-border p-4 bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{s.order_ref}</span>
                    <span className="text-xs text-muted-foreground">• {s.buyer}</span>
                    <Badge className={`${STATUS_CONFIG[s.status].color} text-xs`}>{STATUS_CONFIG[s.status].label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {s.destination}
                  </div>
                </div>
                <ShipmentTimeline shipment={s} />
                {s.delay_reason && (
                  <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {s.delay_reason} — {s.delay_days} day(s) delayed
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="entry" className="space-y-4 mt-0">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Manage Shipments</CardTitle>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Shipment</Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Click "Add Shipment" to create a new shipment, or use the edit buttons in the View tab to update existing records.</p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Shipment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Order Reference *</Label><Input value={form.order_ref} onChange={e => updateField('order_ref', e.target.value)} placeholder="e.g. AAF-3100" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Buyer *</Label><Input value={form.buyer} onChange={e => updateField('buyer', e.target.value)} placeholder="e.g. Gap" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Destination *</Label><Input value={form.destination} onChange={e => updateField('destination', e.target.value)} placeholder="e.g. New York, USA" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => updateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={form.quantity || ''} onChange={e => updateField('quantity', parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Packed Qty</Label><Input type="number" min={0} value={form.packed_qty || ''} onChange={e => updateField('packed_qty', parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Shipped Qty</Label><Input type="number" min={0} value={form.shipped_qty || ''} onChange={e => updateField('shipped_qty', parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Ship Date</Label><Input type="date" value={form.ship_date} onChange={e => updateField('ship_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Delivery</Label><Input type="date" value={form.expected_delivery} onChange={e => updateField('expected_delivery', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Carrier</Label><Input value={form.carrier} onChange={e => updateField('carrier', e.target.value)} placeholder="e.g. Maersk" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tracking Number</Label><Input value={form.tracking_number} onChange={e => updateField('tracking_number', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Delay Days</Label><Input type="number" min={0} value={form.delay_days || ''} onChange={e => updateField('delay_days', parseInt(e.target.value) || 0)} /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Delay Reason</Label><Input value={form.delay_reason} onChange={e => updateField('delay_reason', e.target.value)} placeholder="If delayed, explain why" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Remarks</Label><Input value={form.remarks} onChange={e => updateField('remarks', e.target.value)} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.order_ref || !form.buyer || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
