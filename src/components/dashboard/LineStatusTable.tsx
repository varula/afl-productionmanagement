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
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-bold">Line Performance Summary — Today vs Target</CardTitle>
          <span className="text-[10px] text-muted-foreground">Mar 8, 2026 · Up to 4 PM</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Line</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Style</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">Target</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">Output</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">Shortfall</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">Eff %</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">DHU %</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => {
                const config = statusConfig[line.status];
                const shortfall = line.output - line.target;
                return (
                  <TableRow key={`${line.lineNumber}-${idx}`} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-bold text-foreground text-[11.5px]">Line {line.lineNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-[11.5px]">{line.style}</TableCell>
                    <TableCell className="text-right text-[11.5px] font-medium">{line.target.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[11.5px] font-medium">{line.output.toLocaleString()}</TableCell>
                    <TableCell className={cn('text-right text-[11.5px] font-medium', shortfall < 0 ? 'text-pink' : 'text-success')}>
                      {shortfall >= 0 ? '+' : ''}{shortfall.toLocaleString()}
                    </TableCell>
                    <TableCell className={cn('text-right text-[11.5px] font-bold',
                      line.efficiency >= 92 ? 'text-success' : line.efficiency >= 85 ? 'text-warning' : 'text-pink'
                    )}>
                      {line.efficiency}%
                    </TableCell>
                    <TableCell className={cn('text-right text-[11.5px]', line.dhu > 3 ? 'text-pink font-bold' : 'text-muted-foreground')}>
                      {line.dhu}%
                    </TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', config.className)}>
                        <span className="w-[5px] h-[5px] rounded-full bg-current" />
                        {config.label}
                      </span>
                    </TableCell>
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
