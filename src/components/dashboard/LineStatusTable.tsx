import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  on_track: { label: 'On Track', className: 'bg-success/10 text-success border-success/20' },
  at_risk: { label: 'At Risk', className: 'bg-warning/10 text-warning border-warning/20' },
  behind: { label: 'Behind', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function LineStatusTable({ lines }: LineStatusTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <h3 className="text-base font-semibold text-card-foreground">Line Status</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Line</TableHead>
            <TableHead>Style</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Output</TableHead>
            <TableHead className="text-right">Eff %</TableHead>
            <TableHead className="text-right">Achv %</TableHead>
            <TableHead className="text-right">DHU %</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const cfg = statusConfig[line.status];
            return (
              <TableRow key={line.lineNumber}>
                <TableCell className="font-medium">L{line.lineNumber}</TableCell>
                <TableCell>{line.style}</TableCell>
                <TableCell className="text-right">{line.target}</TableCell>
                <TableCell className="text-right font-medium">{line.output}</TableCell>
                <TableCell className={cn('text-right font-medium',
                  line.efficiency >= 65 ? 'text-success' : line.efficiency >= 50 ? 'text-warning' : 'text-destructive'
                )}>
                  {line.efficiency.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">{line.achievement.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{line.dhu.toFixed(1)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>
                    {cfg.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
