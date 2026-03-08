import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const stockItems = [
  { material: 'Cotton Fabric (White)', unit: 'yards', stock: 12400, minLevel: 5000, status: 'ok', category: 'fabric', buyer: 'Gap' },
  { material: 'Polyester Blend (Navy)', unit: 'yards', stock: 8200, minLevel: 4000, status: 'ok', category: 'fabric', buyer: 'Lager 157' },
  { material: 'Elastic Band (1")', unit: 'rolls', stock: 340, minLevel: 200, status: 'ok', category: 'accessories', buyer: 'UCB' },
  { material: 'Zipper #5 (Black)', unit: 'pcs', stock: 180, minLevel: 500, status: 'low', category: 'accessories', buyer: 'ZXY' },
  { material: 'Thread (White)', unit: 'cones', stock: 1200, minLevel: 600, status: 'ok', category: 'accessories', buyer: 'Gap' },
  { material: 'Button 4-hole (Brown)', unit: 'gross', stock: 45, minLevel: 100, status: 'low', category: 'accessories', buyer: 'Cubus' },
  { material: 'Interlining (Med Weight)', unit: 'yards', stock: 3200, minLevel: 2000, status: 'ok', category: 'fabric', buyer: 'Lager 157' },
  { material: 'Hang Tags', unit: 'pcs', stock: 8900, minLevel: 3000, status: 'ok', category: 'packaging', buyer: 'Gap' },
  { material: 'Poly Bags (M)', unit: 'pcs', stock: 15000, minLevel: 5000, status: 'ok', category: 'packaging', buyer: 'UCB' },
];

const categoryMap: Record<string, string> = {
  'inv-fabric': 'fabric', 'inv-accessories': 'accessories', 'inv-packaging': 'packaging',
};
const buyerMap: Record<string, string> = {
  'invb-gap': 'Gap', 'invb-lager157': 'Lager 157', 'invb-ucb': 'UCB', 'invb-zxy': 'ZXY', 'invb-cubus': 'Cubus',
};

export default function InventoryPage() {
  const activeFilter = useActiveFilter();

  const filtered = useMemo(() => {
    if (!activeFilter || activeFilter === 'inv-all') return stockItems;
    if (activeFilter === 'inv-critical' || activeFilter === 'inv-low') return stockItems.filter(i => i.status === 'low');
    if (categoryMap[activeFilter]) return stockItems.filter(i => i.category === categoryMap[activeFilter]);
    if (buyerMap[activeFilter]) return stockItems.filter(i => i.buyer === buyerMap[activeFilter]);
    return stockItems;
  }, [activeFilter]);

  const lowStock = filtered.filter(i => i.status === 'low').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" /> Inventory
        </h1>
        <p className="text-sm text-muted-foreground">{filtered.length} materials shown · {lowStock} low stock</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Materials', value: String(filtered.length), color: 'border-primary/20' },
          { label: 'Adequate', value: String(filtered.length - lowStock), color: 'border-success/20' },
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
                {filtered.map((item, i) => (
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
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No items match this filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
