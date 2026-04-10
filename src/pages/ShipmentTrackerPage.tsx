import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MapPin, Ship, Package, CheckCircle, AlertTriangle, Clock, Truck, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type ShipmentStatus = 'pending' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'delayed';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; icon: typeof Ship }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  packed: { label: 'Packed', color: 'bg-primary/10 text-primary', icon: Package },
  dispatched: { label: 'Dispatched', color: 'bg-purple-500/10 text-purple-600', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-warning/10 text-warning', icon: Ship },
  delivered: { label: 'Delivered', color: 'bg-success/10 text-success', icon: CheckCircle },
  delayed: { label: 'Delayed', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

export default function ShipmentTrackerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipment-tracker'],
    queryFn: async () => {
      const { data } = await supabase.from('shipments').select('*').order('ship_date', { ascending: true });
      return data ?? [];
    },
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['tracker-styles'],
    queryFn: async () => { const { data } = await supabase.from('styles').select('id, style_no, buyer'); return data ?? []; },
  });
  const styleMap = useMemo(() => new Map(styles.map((s: any) => [s.id, s])), [styles]);

  const filtered = useMemo(() => {
    return shipments.filter((s: any) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const style = s.style_id ? styleMap.get(s.style_id) : null;
        return s.order_ref.toLowerCase().includes(term) || s.buyer.toLowerCase().includes(term) ||
          s.destination.toLowerCase().includes(term) || (style?.style_no || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [shipments, statusFilter, searchTerm, styleMap]);

  const totalQty = shipments.reduce((a: number, s: any) => a + s.quantity, 0);
  const shippedQty = shipments.reduce((a: number, s: any) => a + s.shipped_qty, 0);
  const deliveryPct = totalQty > 0 ? Math.round((shippedQty / totalQty) * 100) : 0;
  const delayed = shipments.filter((s: any) => s.status === 'delayed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MapPin className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Shipment Tracker</h1>
          <p className="text-xs text-muted-foreground">Real-time shipment progress and delivery tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Shipments', value: shipments.length, color: 'text-foreground' },
          { label: 'Total Qty', value: totalQty.toLocaleString(), color: 'text-primary' },
          { label: 'Shipped Qty', value: shippedQty.toLocaleString(), color: 'text-success' },
          { label: 'Delivery %', value: `${deliveryPct}%`, color: 'text-warning' },
          { label: 'Delayed', value: delayed, color: 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="border-[1.5px]"><CardContent className="p-3"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search order, buyer, style…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-[1.5px]"><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Order</TableHead>
              <TableHead className="text-xs">Style</TableHead>
              <TableHead className="text-xs">Buyer</TableHead>
              <TableHead className="text-xs">Destination</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <TableHead className="text-xs">Progress</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Ship Date</TableHead>
              <TableHead className="text-xs">ETA</TableHead>
              <TableHead className="text-xs">Days Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-sm py-8 text-muted-foreground">No shipments found</TableCell></TableRow>
            ) : filtered.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status as ShipmentStatus];
              const Icon = cfg.icon;
              const style = s.style_id ? styleMap.get(s.style_id) : null;
              const progress = s.quantity > 0 ? Math.round((s.shipped_qty / s.quantity) * 100) : 0;
              const daysLeft = s.expected_delivery ? differenceInDays(new Date(s.expected_delivery), new Date()) : null;
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-medium">{s.order_ref}</TableCell>
                  <TableCell className="text-xs">{style?.style_no || '—'}</TableCell>
                  <TableCell className="text-xs">{s.buyer}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.destination}</TableCell>
                  <TableCell className="text-xs text-right">{s.quantity.toLocaleString()}</TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={`${cfg.color} text-xs gap-1`}><Icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                  <TableCell className="text-xs">{s.ship_date ? format(new Date(s.ship_date), 'dd MMM') : '—'}</TableCell>
                  <TableCell className="text-xs">{s.expected_delivery ? format(new Date(s.expected_delivery), 'dd MMM') : '—'}</TableCell>
                  <TableCell className="text-xs">
                    {daysLeft !== null ? (
                      <span className={daysLeft < 0 ? 'text-destructive font-medium' : daysLeft < 7 ? 'text-warning' : 'text-muted-foreground'}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
