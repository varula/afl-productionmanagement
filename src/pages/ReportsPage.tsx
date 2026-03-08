import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Calendar, Sheet, FileType, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReportPrintView from '@/components/reports/ReportPrintView';

type ReportFormat = 'pdf' | 'excel' | 'word';

interface Report {
  name: string;
  type: string;
  date: string;
  status: string;
  format: ReportFormat;
}

const reports: Report[] = [
  { name: 'Daily Output Report', type: 'Production', date: 'Mar 08, 2026', status: 'ready', format: 'pdf' },
  { name: 'Shipment Tracker', type: 'Logistics', date: 'Mar 08, 2026', status: 'ready', format: 'excel' },
  { name: 'Delay Analysis', type: 'Production', date: 'Mar 08, 2026', status: 'ready', format: 'pdf' },
  { name: 'Line Efficiency Summary', type: 'Performance', date: 'Mar 08, 2026', status: 'ready', format: 'excel' },
  { name: 'Machine Status Report', type: 'Maintenance', date: 'Mar 08, 2026', status: 'ready', format: 'pdf' },
  { name: 'QC Summary', type: 'Quality', date: 'Mar 08, 2026', status: 'ready', format: 'pdf' },
  { name: 'Buyer Performance', type: 'Sales', date: 'Mar 07, 2026', status: 'ready', format: 'excel' },
  { name: 'Inventory Snapshot', type: 'Inventory', date: 'Mar 07, 2026', status: 'pending', format: 'word' },
];

const formatConfig: Record<ReportFormat, { icon: typeof FileText; color: string; label: string; badgeBg: string }> = {
  pdf: {
    icon: FileText,
    color: 'text-destructive',
    label: 'PDF',
    badgeBg: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  excel: {
    icon: Sheet,
    color: 'text-success',
    label: 'XLS',
    badgeBg: 'bg-success/15 text-success border-success/30',
  },
  word: {
    icon: FileType,
    color: 'text-primary',
    label: 'DOC',
    badgeBg: 'bg-primary/15 text-primary border-primary/30',
  },
};

export default function ReportsPage() {
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

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
          {reports.map((r, i) => {
            const fmt = formatConfig[r.format];
            const FormatIcon = fmt.icon;
            return (
              <div key={r.name} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20 hover:bg-muted/40 transition-colors animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative shrink-0">
                  <FormatIcon className={`h-5 w-5 ${fmt.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.type} · {r.date}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${fmt.badgeBg}`}>
                  {fmt.label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${r.status === 'ready' ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'}`}>
                  {r.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPreviewReport(r)}
                  title="Preview & Print"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Print Preview Dialog */}
      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto print:shadow-none print:border-none print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>{previewReport?.name}</span>
              <Button size="sm" onClick={handlePrint} className="ml-4">
                <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewReport && <ReportPrintView ref={printRef} report={previewReport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
