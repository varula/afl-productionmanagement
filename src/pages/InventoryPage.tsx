import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';

const stockItems = [
  { material: 'Cotton Fabric (White)', unit: 'yards', stock: 12400, minLevel: 5000, status: 'ok' },
  { material: 'Polyester Blend (Navy)', unit: 'yards', stock: 8200, minLevel: 4000, status: 'ok' },
  { material: 'Elastic Band (1")', unit: 'rolls', stock: 340, minLevel: 200, status: 'ok' },
  { material: 'Zipper #5 (Black)', unit: 'pcs', stock: 180, minLevel: 500, status: 'low' },
  { material: 'Thread (White)', unit: 'cones', stock: 1200, minLevel: 600, status: 'ok' },
  { material: 'Button 4-hole (Brown)', unit: 'gross', stock: 45, minLevel: 100, status: 'low' },
  { material: 'Interlining (Med Weight)', unit: 'yards', stock: 3200, minLevel: 2000, status: 'ok' },
  { material: 'Hang Tags', unit: 'pcs', stock: 8900, minLevel: 3000, status: 'ok' },
];

export default function InventoryPage() {
  const lowStock = stockItems.filter(i => i.status === 'low').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" /> Inventory
        </h1>
        <p className="text-sm text-muted-foreground">{stockItems.length} materials tracked · {lowStock} low stock alerts</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Materials', value: String(stockItems.length), color: 'border-primary/20' },
          { label: 'Adequate', value: String(stockItems.length - lowStock), color: 'border-success/20' },
          { label: 'Low Stock', value: String(lowStock), color: 'border-pink/20' },
          { label: 'Orders Pending', value: '3', color: 'border-warning/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Stock Levels</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Material</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Stock</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Min Level</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item, i) => (
                  <tr key={item.material} className="border-b border-border/50 hover:bg-muted/30 animate-pop-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="py-2.5 px-3 font-medium text-foreground flex items-center gap-2">
                      {item.status === 'low' && <AlertTriangle className="h-3.5 w-3.5 text-pink shrink-0" />}
                      {item.material}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{item.stock.toLocaleString()} {item.unit}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{item.minLevel.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${item.status === 'low' ? 'bg-pink/15 text-pink border-pink/30' : 'bg-success/15 text-success border-success/30'}`}>
                        {item.status === 'low' ? 'Low' : 'OK'}
                      </Badge>
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
