import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const reports = [
  { name: 'Daily Output Report', type: 'Production', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'Shipment Tracker', type: 'Logistics', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'Delay Analysis', type: 'Production', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'Line Efficiency Summary', type: 'Performance', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'Machine Status Report', type: 'Maintenance', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'QC Summary', type: 'Quality', date: 'Mar 08, 2026', status: 'ready' },
  { name: 'Buyer Performance', type: 'Sales', date: 'Mar 07, 2026', status: 'ready' },
  { name: 'Inventory Snapshot', type: 'Inventory', date: 'Mar 07, 2026', status: 'pending' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground">{reports.length} reports available</p>
        </div>
        <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-1" /> Date Range</Button>
      </div>

      <Card className="border-[1.5px]">
        <CardContent className="pt-4 space-y-2">
          {reports.map((r, i) => (
            <div key={r.name} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20 hover:bg-muted/40 transition-colors animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">{r.name}</p>
                <p className="text-[10px] text-muted-foreground">{r.type} · {r.date}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${r.status === 'ready' ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'}`}>
                {r.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
