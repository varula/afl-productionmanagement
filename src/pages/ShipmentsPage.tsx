import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveFilter } from '@/hooks/useActiveFilter';
import { Ship, Package, AlertTriangle, CheckCircle, Clock, Truck, MapPin, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

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
  packed: { label: 'Packed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
  dispatched: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Ship },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
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
  const completedSteps = TIMELINE_STEPS.filter(
    s => shipment[s.key as keyof Shipment] !== null
  ).length;

  return (
    <div className="flex items-center gap-1 w-full">
      {TIMELINE_STEPS.map((step, i) => {
        const done = shipment[step.key as keyof Shipment] !== null;
        const ts = shipment[step.key as keyof Shipment] as string | null;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  done
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground/30'
                }`}
              />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{step.label}</span>
              {ts && (
                <span className="text-[8px] text-muted-foreground/60">
                  {format(new Date(ts), 'dd MMM')}
                </span>
              )}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  completedSteps > i + 1 ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
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
    win.document.write(`
      <html><head><title>Packing List - ${shipment.order_ref}</title>
      <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}.header{display:flex;justify-content:space-between;margin-bottom:20px}</style>
      </head><body>
      <div class="header"><div><h1>Packing List</h1><p>${shipment.order_ref}</p></div><div><p>Date: ${format(new Date(), 'dd MMM yyyy')}</p></div></div>
      <table><tr><th>Field</th><th>Details</th></tr>
      <tr><td>Buyer</td><td>${shipment.buyer}</td></tr>
      <tr><td>Destination</td><td>${shipment.destination}</td></tr>
      <tr><td>Total Qty</td><td>${shipment.quantity.toLocaleString()}</td></tr>
      <tr><td>Packed Qty</td><td>${shipment.packed_qty.toLocaleString()}</td></tr>
      <tr><td>Shipped Qty</td><td>${shipment.shipped_qty.toLocaleString()}</td></tr>
      <tr><td>Ship Date</td><td>${shipment.ship_date || 'TBD'}</td></tr>
      <tr><td>Carrier</td><td>${shipment.carrier || 'TBD'}</td></tr>
      <tr><td>Tracking #</td><td>${shipment.tracking_number || 'N/A'}</td></tr>
      <tr><td>Status</td><td>${STATUS_CONFIG[shipment.status].label}</td></tr>
      <tr><td>Remarks</td><td>${shipment.remarks || '-'}</td></tr>
      </table></body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handlePrint} className="h-7 px-2">
      <Printer className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ShipmentsPage() {
  const [activeFilter] = useActiveFilter();
  const [activeTab, setActiveTab] = useState('all');

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Shipment[];
    },
  });

  // Filter based on sidebar
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

  // KPIs
  const totalShipments = shipments.length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const delayed = shipments.filter(s => s.status === 'delayed').length;
  const pending = shipments.filter(s => s.status === 'pending' || s.status === 'packed').length;
  const onTimeRate = totalShipments > 0
    ? Math.round(((delivered) / Math.max(delivered + delayed, 1)) * 100)
    : 0;
  const totalQty = shipments.reduce((s, r) => s + r.quantity, 0);
  const shippedQty = shipments.reduce((s, r) => s + r.shipped_qty, 0);

  const handleExportCSV = () => {
    const headers = ['Order Ref', 'Buyer', 'Destination', 'Qty', 'Packed', 'Shipped', 'Status', 'Ship Date', 'Expected', 'Carrier', 'Tracking #'];
    const rows = filtered.map(s => [
      s.order_ref, s.buyer, s.destination, s.quantity, s.packed_qty, s.shipped_qty,
      STATUS_CONFIG[s.status].label, s.ship_date || '', s.expected_delivery || '',
      s.carrier || '', s.tracking_number || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Shipment Status</h1>
            <p className="text-xs text-muted-foreground">Track orders from production to delivery</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-foreground">{totalShipments}</div>
            <div className="text-[11px] text-muted-foreground">Total Shipments</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-emerald-600">{delivered}</div>
            <div className="text-[11px] text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-amber-600">{inTransit}</div>
            <div className="text-[11px] text-muted-foreground">In Transit</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{delayed}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              Delayed
              {delayed > 0 && <AlertTriangle className="h-3 w-3" />}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-primary">{onTimeRate}%</div>
            <div className="text-[11px] text-muted-foreground">On-Time Rate</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-foreground">{shippedQty.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">/ {totalQty.toLocaleString()} pcs shipped</div>
          </CardContent>
        </Card>
      </div>

      {/* Delay Alerts */}
      {delayed > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Delay Alerts ({delayed})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {shipments.filter(s => s.status === 'delayed').map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs bg-background rounded-md p-2 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[9px]">{s.delay_days}d late</Badge>
                  <span className="font-medium text-foreground">{s.order_ref}</span>
                  <span className="text-muted-foreground">• {s.buyer}</span>
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{s.destination}</span>
                </div>
                <span className="text-destructive/80 text-[10px]">{s.delay_reason}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Table / Timeline */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Shipment List</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-3">
          <Card>
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
                    <TableHead className="text-xs">Carrier</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">No shipments found</TableCell></TableRow>
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
                          <Badge className={`${cfg.color} text-[9px] gap-1`}>
                            <Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{s.ship_date ? format(new Date(s.ship_date), 'dd MMM') : '—'}</TableCell>
                        <TableCell className="text-xs">{s.expected_delivery ? format(new Date(s.expected_delivery), 'dd MMM') : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.carrier || '—'}</TableCell>
                        <TableCell><PackingListPrint shipment={s} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-3 space-y-3">
          {filtered.map(s => (
            <Card key={s.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{s.order_ref}</span>
                    <span className="text-xs text-muted-foreground">• {s.buyer}</span>
                    <Badge className={`${STATUS_CONFIG[s.status].color} text-[9px]`}>
                      {STATUS_CONFIG[s.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {s.destination}
                    <PackingListPrint shipment={s} />
                  </div>
                </div>
                <ShipmentTimeline shipment={s} />
                {s.delay_reason && (
                  <div className="mt-2 text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {s.delay_reason} — {s.delay_days} day(s) delayed
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
