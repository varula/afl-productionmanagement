import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const demoOrders = [
  { id: 'AAF-3101', buyer: 'Gap', style: "Men's Fleece Hoodie", pcs: 142400, stage: 'Cutting', progress: 22, priority: 'high', status: 'active' },
  { id: 'AAF-3102', buyer: 'Lager 157', style: "Women's Printed Blouse", pcs: 318200, stage: 'Sewing', progress: 56, priority: 'high', status: 'active' },
  { id: 'AAF-3103', buyer: 'UCB', style: "Men's Polo Shirt", pcs: 48600, stage: 'QC', progress: 78, priority: 'medium', status: 'active' },
  { id: 'AAF-3104', buyer: 'ZXY', style: 'Sport Legging AW26', pcs: 96400, stage: 'Finishing', progress: 45, priority: 'medium', status: 'active' },
  { id: 'AAF-3105', buyer: 'Cubus', style: 'Kids Knit Cardigan', pcs: 22100, stage: 'Packing', progress: 91, priority: 'low', status: 'active' },
  { id: 'AAF-3106', buyer: 'Gap', style: "Women's Chino Trouser", pcs: 18800, stage: 'Sewing', progress: 34, priority: 'high', status: 'delayed' },
  { id: 'AAF-3107', buyer: 'Lager 157', style: 'Woven Shorts — Summer', pcs: 64000, stage: 'Cutting', progress: 12, priority: 'medium', status: 'active' },
];

const stageColors: Record<string, string> = {
  Cutting: 'bg-primary/15 text-primary border-primary/30',
  Sewing: 'bg-purple/15 text-purple border-purple/30',
  QC: 'bg-warning/15 text-warning border-warning/30',
  Finishing: 'bg-success/15 text-success border-success/30',
  Packing: 'bg-accent/15 text-accent border-accent/30',
};

const priorityColors: Record<string, string> = {
  high: 'bg-pink/15 text-pink border-pink/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function OrdersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Active Orders
          </h1>
          <p className="text-sm text-muted-foreground">7 orders · 4 buyers</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-8 w-48" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: '18', color: 'border-primary/20' },
          { label: 'Active', value: '14', color: 'border-success/20' },
          { label: 'Delayed', value: '4', color: 'border-pink/20' },
          { label: 'Avg Progress', value: '48%', color: 'border-accent/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders Table */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold">Order Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Order ID</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Buyer</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Style</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Qty</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Stage</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Priority</th>
                  <th className="py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {demoOrders.map((order, i) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="py-2.5 px-3 font-bold text-foreground">{order.id}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{order.buyer}</td>
                    <td className="py-2.5 px-3 text-foreground font-medium">{order.style}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{order.pcs.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${stageColors[order.stage] || ''}`}>{order.stage}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] capitalize ${priorityColors[order.priority]}`}>{order.priority}</Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Progress value={order.progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{order.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
