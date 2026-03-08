import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface LineStatus {
  lineNumber: number;
  style: string;
  target: number;
  output: number;
  efficiency: number;
  achievement: number;
  dhu: number;
  status: 'on_track' | 'at_risk' | 'behind';
}

interface LineStatusTableProps {
  lines: LineStatus[];
}

const statusConfig = {
  on_track: { label: 'On Track', className: 'bg-success/10 text-success border-success/30' },
  at_risk: { label: 'At Risk', className: 'bg-warning/10 text-warning border-warning/30' },
  behind: { label: 'Behind', className: 'bg-pink/10 text-pink border-pink/30' },
};

export function LineStatusTable({ lines }: LineStatusTableProps) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Line Performance Summary</CardTitle>
          <span className="text-[10px] text-muted-foreground">Today vs Target</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2.5 w-[72px]">Line</th>
                <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 min-w-[120px]">Style</th>
                <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[72px]">Target</th>
                <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[72px]">Output</th>
                <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[80px]">Shortfall</th>
                <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[64px]">Eff %</th>
                <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[56px]">DHU %</th>
                <th className="text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-2.5 w-[88px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const config = statusConfig[line.status];
                const shortfall = line.output - line.target;
                return (
                  <tr key={`${line.lineNumber}-${idx}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-[11.5px] font-bold text-foreground whitespace-nowrap">Line {line.lineNumber}</td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">{line.style}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] font-medium text-foreground tabular-nums">{line.target.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] font-medium text-foreground tabular-nums">{line.output.toLocaleString()}</td>
                    <td className={cn('px-3 py-2.5 text-right text-[11.5px] font-semibold tabular-nums', shortfall < 0 ? 'text-pink' : 'text-success')}>
                      {shortfall >= 0 ? '+' : ''}{shortfall.toLocaleString()}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right text-[11.5px] font-bold tabular-nums',
                      line.efficiency >= 92 ? 'text-success' : line.efficiency >= 85 ? 'text-warning' : 'text-pink'
                    )}>
                      {line.efficiency}%
                    </td>
                    <td className={cn('px-3 py-2.5 text-right text-[11.5px] tabular-nums', line.dhu > 3 ? 'text-pink font-bold' : 'text-muted-foreground')}>
                      {line.dhu}%
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap', config.className)}>
                        <span className="w-[5px] h-[5px] rounded-full bg-current shrink-0" />
                        {config.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
