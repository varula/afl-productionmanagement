import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LineStatus } from './LineStatusTable';

interface SubPanelProps {
  filter: string;
  lines: LineStatus[];
  onClose: () => void;
}

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    'On Track': 'bg-success/10 text-success border-success/30',
    'Below Target': 'bg-warning/10 text-warning border-warning/30',
    'Delayed': 'bg-pink/10 text-pink border-pink/30',
    'QC Hold': 'bg-warning/10 text-warning border-warning/30',
    'Loading': 'bg-accent/10 text-accent border-accent/30',
    'Finishing': 'bg-success/10 text-success border-success/30',
    'At Risk': 'bg-pink/10 text-pink border-pink/30',
    'Critical': 'bg-destructive/10 text-destructive border-destructive/30',
    'In Progress': 'bg-warning/10 text-warning border-warning/30',
    'Overdue': 'bg-pink/10 text-pink border-pink/30',
    'Pass': 'bg-success/10 text-success border-success/30',
    'Watch': 'bg-warning/10 text-warning border-warning/30',
    'Hold Active': 'bg-warning/10 text-warning border-warning/30',
    'Good': 'bg-success/10 text-success border-success/30',
    'Excellent': 'bg-success/10 text-success border-success/30',
    'Normal': 'bg-success/10 text-success border-success/30',
    'Urgent': 'bg-destructive/10 text-destructive border-destructive/30',
    'Planned': 'bg-primary/10 text-primary border-primary/30',
    'Partial': 'bg-purple/10 text-purple border-purple/30',
    'Low': 'bg-warning/10 text-warning border-warning/30',
    'Closing': 'bg-success/10 text-success border-success/30',
    'Improving': 'bg-success/10 text-success border-success/30',
  };
  return map[status] || 'bg-muted text-muted-foreground border-border';
};

function Pill({ label }: { label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusPill(label))}>
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      {label}
    </span>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs">
        <X className="h-3.5 w-3.5 mr-1" /> Close
      </Button>
    </div>
  );
}

function OutputPanel({ lines, onClose }: { lines: LineStatus[]; onClose: () => void }) {
  const total = lines.reduce((s, l) => ({ target: s.target + l.target, output: s.output + l.output }), { target: 0, output: 0 });
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title={`Daily Output Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (All Lines)`} onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="text-[10px]">Floor / Line</TableHead><TableHead className="text-[10px]">Style</TableHead><TableHead className="text-right text-[10px]">Target</TableHead><TableHead className="text-right text-[10px]">Achieved</TableHead><TableHead className="text-right text-[10px]">Deficit</TableHead><TableHead className="text-right text-[10px]">Efficiency</TableHead><TableHead className="text-[10px]">Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => {
                const deficit = l.output - l.target;
                const statusLabel = l.status === 'on_track' ? 'On Track' : l.status === 'at_risk' ? 'Below Target' : 'Delayed';
                return (
                  <TableRow key={i}>
                    <TableCell className="font-semibold text-[11.5px]">Line {l.lineNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-[11.5px]">{l.style}</TableCell>
                    <TableCell className="text-right text-[11.5px]">{l.target.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[11.5px] font-medium">{l.output.toLocaleString()}</TableCell>
                    <TableCell className={cn('text-right text-[11.5px] font-medium', deficit < 0 ? 'text-warning' : 'text-success')}>
                      {deficit >= 0 ? '+' : ''}{deficit.toLocaleString()}
                    </TableCell>
                    <TableCell className={cn('text-right text-[11.5px] font-bold', l.efficiency >= 90 ? 'text-success' : l.efficiency >= 80 ? 'text-warning' : 'text-pink')}>
                      {l.efficiency}%
                    </TableCell>
                    <TableCell><Pill label={statusLabel} /></TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell colSpan={2} className="text-[11.5px] font-bold">TOTAL — All Lines ({lines.length})</TableCell>
                <TableCell className="text-right text-[11.5px] font-bold">{total.target.toLocaleString()}</TableCell>
                <TableCell className="text-right text-[11.5px] font-bold">{total.output.toLocaleString()}</TableCell>
                <TableCell className={cn('text-right text-[11.5px] font-bold', total.output - total.target < 0 ? 'text-pink' : 'text-success')}>
                  {(total.output - total.target).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-[11.5px] font-bold">
                  {total.target > 0 ? Math.round(total.output / total.target * 100) : 0}%
                </TableCell>
                <TableCell><Pill label="Partial" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderStatusPanel({ lines, onClose }: { lines: LineStatus[]; onClose: () => void }) {
  const onTrack = lines.filter(l => l.status === 'on_track').length;
  const atRisk = lines.filter(l => l.status === 'at_risk').length;
  const behind = lines.filter(l => l.status === 'behind').length;
  const stages = [
    { stage: 'Cutting', count: Math.round(lines.length * 0.1), status: 'Normal' },
    { stage: 'Sewing', count: Math.round(lines.length * 0.55), status: 'Normal' },
    { stage: 'QC Hold', count: Math.round(lines.length * 0.08), status: 'Urgent' },
    { stage: 'Finishing', count: Math.round(lines.length * 0.15), status: 'Normal' },
    { stage: 'Packing', count: Math.round(lines.length * 0.05), status: 'Normal' },
    { stage: 'Delayed', count: behind, status: 'Critical' },
    { stage: 'Planned', count: Math.round(lines.length * 0.07), status: 'Planned' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title={`Order Status Overview — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`} onClose={onClose} />
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {[{ label: 'Total Active', value: lines.length, color: 'primary' }, { label: 'On Schedule', value: onTrack, color: 'success' }, { label: 'Delayed', value: behind, color: 'pink' }, { label: 'At Risk', value: atRisk, color: 'warning' }].map(s => (
            <div key={s.label} className={`rounded-xl border-[1.5px] border-${s.color}/20 bg-card p-3 text-center`}>
              <div className="text-lg font-extrabold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Stage</TableHead><TableHead className="text-right text-[10px]">Lines</TableHead><TableHead className="text-[10px]">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {stages.map(s => (
                <TableRow key={s.stage}>
                  <TableCell><Pill label={s.stage} /></TableCell>
                  <TableCell className="text-right font-semibold text-[11.5px]">{s.count}</TableCell>
                  <TableCell><Pill label={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ShipmentPanel({ onClose }: { onClose: () => void }) {
  const shipments = [
    { order: 'AAF-3107', buyer: 'Lager 157', style: 'Woven Shorts', qty: '22,000', exFactory: 'Mar 8', mode: 'Sea', port: 'Ctg Port', eta: 'Mar 28', status: 'Loading' },
    { order: 'AAF-3101', buyer: 'Gap', style: 'Fleece Hoodie', qty: '42,000', exFactory: 'Mar 12', mode: 'Air', port: 'Dhaka Intl', eta: 'Mar 13', status: 'Finishing' },
    { order: 'AAF-3106', buyer: 'Gap', style: 'Chino Trouser', qty: '30,000', exFactory: 'Mar 18', mode: 'Air', port: 'Dhaka Intl', eta: 'Mar 19', status: 'QC Hold' },
    { order: 'AAF-3104', buyer: 'ZXY', style: 'Sport Legging', qty: '52,000', exFactory: 'Mar 15', mode: 'Air', port: 'Dhaka Intl', eta: 'Mar 16', status: 'At Risk' },
    { order: 'AAF-3109', buyer: 'UCB', style: 'Polo Shirt', qty: '35,000', exFactory: 'Mar 20', mode: 'Sea', port: 'Ctg Port', eta: 'Apr 12', status: 'On Track' },
    { order: 'AAF-3112', buyer: 'Cubus', style: 'Kids Pyjama', qty: '28,000', exFactory: 'Mar 25', mode: 'Sea', port: 'Ctg Port', eta: 'Apr 18', status: 'On Track' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Shipment Tracker — March 2026" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Order</TableHead><TableHead className="text-[10px]">Buyer</TableHead><TableHead className="text-[10px]">Style</TableHead>
                <TableHead className="text-right text-[10px]">Qty</TableHead><TableHead className="text-[10px]">Ex-Factory</TableHead><TableHead className="text-[10px]">Mode</TableHead>
                <TableHead className="text-[10px]">Port</TableHead><TableHead className="text-[10px]">ETA</TableHead><TableHead className="text-[10px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map(s => (
                <TableRow key={s.order}>
                  <TableCell className="font-bold text-[11px]">{s.order}</TableCell>
                  <TableCell className="text-[11.5px]">{s.buyer}</TableCell>
                  <TableCell className="text-muted-foreground text-[11.5px]">{s.style}</TableCell>
                  <TableCell className="text-right text-[11.5px]">{s.qty}</TableCell>
                  <TableCell className="text-[11.5px]">{s.exFactory}</TableCell>
                  <TableCell className="text-[11.5px]">{s.mode}</TableCell>
                  <TableCell className="text-[11.5px]">{s.port}</TableCell>
                  <TableCell className="text-[11.5px]">{s.eta}</TableCell>
                  <TableCell><Pill label={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DelayPanel({ lines, onClose }: { lines: LineStatus[]; onClose: () => void }) {
  const delayed = lines.filter(l => l.status === 'behind' || l.status === 'at_risk');
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Delay Analysis — Lines Below Target" onClose={onClose} />
        {delayed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No delayed or at-risk lines currently</p>
        ) : (
          <div className="space-y-2">
            {delayed.map((l, i) => (
              <div key={i} className={cn('flex items-center justify-between px-3 py-2.5 rounded-lg border', l.status === 'behind' ? 'bg-pink/5 border-pink/20' : 'bg-warning/5 border-warning/20')}>
                <div>
                  <div className="text-[12px] font-bold text-foreground">Line {l.lineNumber} — {l.style}</div>
                  <div className="text-[10.5px] text-muted-foreground">Eff: {l.efficiency}% · Output: {l.output.toLocaleString()} / Target: {l.target.toLocaleString()}</div>
                </div>
                <Pill label={l.status === 'behind' ? 'Delayed' : 'At Risk'} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QCSummaryPanel({ lines, onClose }: { lines: LineStatus[]; onClose: () => void }) {
  const qcData = [
    { point: 'SF-01 Inline', inspector: 'QC Inspector A', inspected: 8400, pass: 8268, fail: 132, topDefect: 'Thread hanging' },
    { point: 'SF-02 Inline', inspector: 'QC Inspector B', inspected: 7900, pass: 7650, fail: 250, topDefect: 'Stitch skip' },
    { point: 'SF-03 Inline', inspector: 'QC Inspector C', inspected: 8200, pass: 7962, fail: 238, topDefect: 'Fabric shade' },
    { point: 'FF-01 Final', inspector: 'QC Inspector D', inspected: 11520, pass: 11420, fail: 100, topDefect: 'Press mark' },
    { point: 'FF-02 Final', inspector: 'QC Inspector E', inspected: 9360, pass: 9228, fail: 132, topDefect: 'Measurement' },
    { point: 'Shipment Audit', inspector: 'QC Manager', inspected: 1440, pass: 1432, fail: 8, topDefect: 'Label' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title={`QC Summary — All Floors — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`} onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">QC Point</TableHead><TableHead className="text-[10px]">Inspector</TableHead><TableHead className="text-right text-[10px]">Inspected</TableHead><TableHead className="text-right text-[10px]">Pass</TableHead><TableHead className="text-right text-[10px]">Fail</TableHead><TableHead className="text-right text-[10px]">Rate</TableHead><TableHead className="text-[10px]">Top Defect</TableHead><TableHead className="text-[10px]">Result</TableHead></TableRow></TableHeader>
            <TableBody>
              {qcData.map(q => {
                const rate = ((q.pass / q.inspected) * 100).toFixed(1);
                return (
                  <TableRow key={q.point}>
                    <TableCell className="font-semibold text-[11.5px]">{q.point}</TableCell>
                    <TableCell className="text-muted-foreground text-[11.5px]">{q.inspector}</TableCell>
                    <TableCell className="text-right text-[11.5px]">{q.inspected.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[11.5px]">{q.pass.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[11.5px] text-pink">{q.fail}</TableCell>
                    <TableCell className="text-right text-[11.5px] font-bold text-success">{rate}%</TableCell>
                    <TableCell className="text-muted-foreground text-[11.5px]">{q.topDefect}</TableCell>
                    <TableCell><Pill label={Number(rate) >= 98 ? 'Pass' : 'Watch'} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MachinePanel({ onClose }: { onClose: () => void }) {
  const machines = [
    { id: 'M-CF-001', floor: 'CF-01 / C1', type: 'Auto Cutter', issue: 'Motor failure — belt snapped', impact: '-3,000 pcs/day cut capacity', tech: 'Khairul Islam', eta: 'Mar 7', status: 'Critical' },
    { id: 'M-L8-012', floor: 'SF-02 / L8', type: 'Lockstitch', issue: 'Timing misaligned', impact: '74% line efficiency', tech: 'Alam Hossain', eta: 'Mar 7', status: 'Critical' },
    { id: 'M-L3-004', floor: 'SF-01 / L3', type: 'Bartack', issue: 'Scheduled lubrication', impact: 'Minor — line running', tech: 'Nurul Amin', eta: 'Today eve', status: 'In Progress' },
    { id: 'M-CF-004', floor: 'CF-01 / C2', type: 'Band Knife', issue: 'Blade replacement due', impact: 'C2 running at 60%', tech: 'Khairul Islam', eta: 'Today', status: 'In Progress' },
    { id: 'M-FF2-008', floor: 'FF-02 / F4', type: 'Steam Press', issue: 'Heating element fault', impact: 'F4 efficiency 78%', tech: 'External Tech', eta: 'Mar 8', status: 'Overdue' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Machine Status Summary" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Machine ID</TableHead><TableHead className="text-[10px]">Floor / Line</TableHead><TableHead className="text-[10px]">Type</TableHead><TableHead className="text-[10px]">Issue</TableHead><TableHead className="text-[10px]">Impact</TableHead><TableHead className="text-[10px]">Technician</TableHead><TableHead className="text-[10px]">ETA Fix</TableHead><TableHead className="text-[10px]">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {machines.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-bold text-[11px]">{m.id}</TableCell>
                  <TableCell className="text-[11.5px]">{m.floor}</TableCell>
                  <TableCell className="text-muted-foreground text-[11.5px]">{m.type}</TableCell>
                  <TableCell className="text-[11.5px]">{m.issue}</TableCell>
                  <TableCell className={cn('text-[11.5px]', m.status === 'Critical' ? 'text-pink font-semibold' : 'text-muted-foreground')}>{m.impact}</TableCell>
                  <TableCell className="text-[11.5px]">{m.tech}</TableCell>
                  <TableCell className="text-[11.5px]">{m.eta}</TableCell>
                  <TableCell><Pill label={m.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyerPanel({ onClose }: { onClose: () => void }) {
  const buyers = [
    { name: 'Gap Inc.', orders: 24, delivered: '44,400', balance: '437,600', otd: 96, defect: 1.6, qc: 'Good', rating: '⭐ 4.9' },
    { name: 'Lager 157', orders: 14, delivered: '27,000', balance: '201,000', otd: 94, defect: 2.1, qc: 'Good', rating: '⭐ 4.7' },
    { name: 'UCB', orders: 12, delivered: '10,400', balance: '185,600', otd: 95, defect: 1.9, qc: 'Good', rating: '⭐ 4.8' },
    { name: 'ZXY', orders: 8, delivered: '2,100', balance: '177,900', otd: 88, defect: 3.2, qc: 'Watch', rating: '⭐ 3.8' },
    { name: 'Cubus', orders: 4, delivered: '9,600', balance: '76,400', otd: 97, defect: 1.4, qc: 'Excellent', rating: '⭐ 4.9' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Buyer Performance Summary — March 2026" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Buyer</TableHead><TableHead className="text-right text-[10px]">Active Orders</TableHead><TableHead className="text-right text-[10px]">Delivered</TableHead><TableHead className="text-right text-[10px]">Balance</TableHead><TableHead className="text-right text-[10px]">OTD %</TableHead><TableHead className="text-right text-[10px]">Defect %</TableHead><TableHead className="text-[10px]">QC</TableHead><TableHead className="text-[10px]">Rating</TableHead></TableRow></TableHeader>
            <TableBody>
              {buyers.map(b => (
                <TableRow key={b.name}>
                  <TableCell className="font-bold text-[11.5px]">{b.name}</TableCell>
                  <TableCell className="text-right text-[11.5px]">{b.orders}</TableCell>
                  <TableCell className="text-right text-[11.5px]">{b.delivered}</TableCell>
                  <TableCell className="text-right text-[11.5px]">{b.balance}</TableCell>
                  <TableCell className={cn('text-right text-[11.5px] font-bold', b.otd >= 94 ? 'text-success' : 'text-pink')}>{b.otd}%</TableCell>
                  <TableCell className="text-right text-[11.5px]">{b.defect}%</TableCell>
                  <TableCell><Pill label={b.qc} /></TableCell>
                  <TableCell className="text-[11.5px]">{b.rating}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryPanel({ onClose }: { onClose: () => void }) {
  const items = [
    { sku: 'FAB-002', material: 'Poly Spandex Black', buyer: 'ZXY / AAF-3104', stock: '2,400m', required: '49,900m', reorder: 'Mar 5 ✓', eta: 'Mar 12', risk: 'Critical' },
    { sku: 'FAB-005', material: 'Linen Cotton Stripe', buyer: 'Lager 157 / AAF-3107', stock: '640m', required: 'Complete', reorder: 'Not needed', eta: '—', risk: 'Closing' },
    { sku: 'ACC-001', material: 'Gap Swing Tags Spring', buyer: 'Gap / AAF-3101, 3106', stock: '4,200 pcs', required: '42,000 pcs', reorder: 'Mar 6 ✓', eta: 'Mar 9', risk: 'Critical' },
    { sku: 'ACC-003', material: 'Poly Bags 40×60cm', buyer: 'All buyers', stock: '18,200 pcs', required: '120,000 pcs', reorder: 'Mar 5 ✓', eta: 'Mar 8', risk: 'Low' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Inventory Snapshot — Critical & Low Stock" onClose={onClose} />
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-pink/5 border border-pink/20 mb-3">
          <AlertTriangle className="h-4 w-4 text-pink shrink-0 mt-0.5" />
          <div>
            <div className="text-[11.5px] font-bold text-pink">3 Critical items — production risk</div>
            <div className="text-[10.5px] text-muted-foreground">Poly Spandex (ZXY), Gap Swing Tags, Poly Bags need immediate reorder</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">SKU</TableHead><TableHead className="text-[10px]">Material</TableHead><TableHead className="text-[10px]">Buyer / Order</TableHead><TableHead className="text-[10px]">Stock</TableHead><TableHead className="text-[10px]">Required</TableHead><TableHead className="text-[10px]">Reorder</TableHead><TableHead className="text-[10px]">ETA</TableHead><TableHead className="text-[10px]">Risk</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(it => (
                <TableRow key={it.sku}>
                  <TableCell className="font-bold text-[11px]">{it.sku}</TableCell>
                  <TableCell className="text-[11.5px]">{it.material}</TableCell>
                  <TableCell className="text-muted-foreground text-[11.5px]">{it.buyer}</TableCell>
                  <TableCell className="text-pink font-semibold text-[11.5px]">{it.stock}</TableCell>
                  <TableCell className="text-[11.5px]">{it.required}</TableCell>
                  <TableCell className="text-[11.5px]">{it.reorder}</TableCell>
                  <TableCell className="text-[11.5px]">{it.eta}</TableCell>
                  <TableCell><Pill label={it.risk} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodPanel({ onClose }: { onClose: () => void }) {
  const kpis = [
    { name: 'Total Output (pcs)', lastWeek: '229,400', thisWeek: '238,120', change: '+8,720', trend: 'Improving' },
    { name: 'Overall Line Efficiency', lastWeek: '90.2%', thisWeek: '91.4%', change: '+1.2%', trend: 'Improving' },
    { name: 'QC Pass Rate', lastWeek: '97.5%', thisWeek: '97.8%', change: '+0.3%', trend: 'Improving' },
    { name: 'Attendance Rate', lastWeek: '95.8%', thisWeek: '96.0%', change: '+0.2%', trend: 'Improving' },
    { name: 'Machine Uptime', lastWeek: '95.0%', thisWeek: '95.8%', change: '+0.8%', trend: 'Improving' },
    { name: 'Machines Down', lastWeek: '7', thisWeek: '5', change: '-2', trend: 'Improving' },
    { name: 'Delayed Orders', lastWeek: '3', thisWeek: '4', change: '+1', trend: 'At Risk' },
    { name: 'OTD Rate', lastWeek: '92.7%', thisWeek: '93.8%', change: '+1.1%', trend: 'Improving' },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Period Comparison — This Week vs Last Week" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">KPI</TableHead><TableHead className="text-right text-[10px]">Last Week</TableHead><TableHead className="text-right text-[10px]">This Week</TableHead><TableHead className="text-right text-[10px]">Change</TableHead><TableHead className="text-[10px]">Trend</TableHead></TableRow></TableHeader>
            <TableBody>
              {kpis.map(k => (
                <TableRow key={k.name}>
                  <TableCell className="font-semibold text-[11.5px]">{k.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-[11.5px]">{k.lastWeek}</TableCell>
                  <TableCell className="text-right font-semibold text-[11.5px]">{k.thisWeek}</TableCell>
                  <TableCell className={cn('text-right font-semibold text-[11.5px]', k.change.startsWith('+') && k.trend !== 'At Risk' ? 'text-success' : k.change.startsWith('-') && k.trend === 'Improving' ? 'text-success' : 'text-pink')}>{k.change}</TableCell>
                  <TableCell><Pill label={k.trend} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendancePanel({ onClose }: { onClose: () => void }) {
  const floors = [
    { floor: 'SF-01 (Lines 1–4)', total: 480, present: 468, absent: 12, rate: 97.5 },
    { floor: 'SF-02 (Lines 5–8)', total: 472, present: 455, absent: 17, rate: 96.4 },
    { floor: 'SF-03 (Lines 9–12)', total: 468, present: 450, absent: 18, rate: 96.2 },
    { floor: 'FF-01 (F1–F2)', total: 200, present: 196, absent: 4, rate: 98.0 },
    { floor: 'FF-02 (F3–F4)', total: 190, present: 182, absent: 8, rate: 95.8 },
    { floor: 'CF-01 (C1–C3)', total: 190, present: 186, absent: 4, rate: 97.9 },
  ];
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Attendance Log — Today" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Floor</TableHead><TableHead className="text-right text-[10px]">Total</TableHead><TableHead className="text-right text-[10px]">Present</TableHead><TableHead className="text-right text-[10px]">Absent</TableHead><TableHead className="text-right text-[10px]">Rate</TableHead></TableRow></TableHeader>
            <TableBody>
              {floors.map(f => (
                <TableRow key={f.floor}>
                  <TableCell className="font-semibold text-[11.5px]">{f.floor}</TableCell>
                  <TableCell className="text-right text-[11.5px]">{f.total}</TableCell>
                  <TableCell className="text-right text-success font-semibold text-[11.5px]">{f.present}</TableCell>
                  <TableCell className="text-right text-pink font-semibold text-[11.5px]">{f.absent}</TableCell>
                  <TableCell className={cn('text-right font-bold text-[11.5px]', f.rate >= 97 ? 'text-success' : 'text-warning')}>{f.rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EfficiencyPanel({ lines, onClose }: { lines: LineStatus[]; onClose: () => void }) {
  const sorted = [...lines].sort((a, b) => b.efficiency - a.efficiency);
  return (
    <Card className="border-[1.5px] animate-fade-in">
      <CardContent className="pt-4">
        <PanelHeader title="Line Efficiency Ranking" onClose={onClose} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">#</TableHead><TableHead className="text-[10px]">Line</TableHead><TableHead className="text-[10px]">Style</TableHead><TableHead className="text-right text-[10px]">Efficiency</TableHead><TableHead className="text-right text-[10px]">Output</TableHead><TableHead className="text-right text-[10px]">Target</TableHead><TableHead className="text-[10px]">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {sorted.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold text-[11.5px]">{i + 1}</TableCell>
                  <TableCell className="font-semibold text-[11.5px]">Line {l.lineNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-[11.5px]">{l.style}</TableCell>
                  <TableCell className={cn('text-right font-bold text-[11.5px]', l.efficiency >= 90 ? 'text-success' : l.efficiency >= 80 ? 'text-warning' : 'text-pink')}>{l.efficiency}%</TableCell>
                  <TableCell className="text-right text-[11.5px]">{l.output.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-[11.5px]">{l.target.toLocaleString()}</TableCell>
                  <TableCell><Pill label={l.status === 'on_track' ? 'On Track' : l.status === 'at_risk' ? 'At Risk' : 'Delayed'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSubPanel({ filter, lines, onClose }: SubPanelProps) {
  switch (filter) {
    case 'dash-output': return <OutputPanel lines={lines} onClose={onClose} />;
    case 'dash-orderstatus': return <OrderStatusPanel lines={lines} onClose={onClose} />;
    case 'dash-shipments': return <ShipmentPanel onClose={onClose} />;
    case 'dash-delays': return <DelayPanel lines={lines} onClose={onClose} />;
    case 'dash-lineeff': return <EfficiencyPanel lines={lines} onClose={onClose} />;
    case 'dash-attendance': return <AttendancePanel onClose={onClose} />;
    case 'dash-machines': return <MachinePanel onClose={onClose} />;
    case 'dash-qcsummary': return <QCSummaryPanel lines={lines} onClose={onClose} />;
    case 'dash-buyers': return <BuyerPanel onClose={onClose} />;
    case 'dash-inventory': return <InventoryPanel onClose={onClose} />;
    case 'dash-period': return <PeriodPanel onClose={onClose} />;
    default: return null;
  }
}
