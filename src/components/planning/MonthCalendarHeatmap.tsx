import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlanEntry {
  date: string;
  line_id: string;
  target_qty: number;
  style?: string;
  lineNo?: string;
}

interface MonthCalendarHeatmapProps {
  monthStart: Date;
  plans: PlanEntry[];
  onDayClick?: (dateStr: string) => void;
}

const DAY_LABELS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getIntensity(target: number, maxTarget: number): string {
  if (target === 0) return 'bg-muted/30 border-border/50';
  const ratio = target / maxTarget;
  if (ratio > 0.8) return 'bg-primary/70 border-primary/40 text-primary-foreground';
  if (ratio > 0.5) return 'bg-primary/45 border-primary/30 text-primary-foreground';
  if (ratio > 0.2) return 'bg-primary/25 border-primary/20 text-foreground';
  return 'bg-primary/10 border-primary/10 text-foreground';
}

export function MonthCalendarHeatmap({ monthStart, plans, onDayClick }: MonthCalendarHeatmapProps) {
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayData = useMemo(() => {
    const map = new Map<string, { totalTarget: number; lineCount: number; styles: Set<string> }>();
    for (const p of plans) {
      const key = p.date;
      const existing = map.get(key) || { totalTarget: 0, lineCount: 0, styles: new Set<string>() };
      existing.totalTarget += p.target_qty;
      existing.lineCount += 1;
      if (p.style) existing.styles.add(p.style);
      map.set(key, existing);
    }
    return map;
  }, [plans]);

  const maxTarget = useMemo(() => {
    let max = 0;
    for (const v of dayData.values()) max = Math.max(max, v.totalTarget);
    return max || 1;
  }, [dayData]);

  // Build grid: Saturday = col 0 ... Friday = col 6
  const firstDayCol = (getDay(monthStart) + 1) % 7; // Sat-based index

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-1.5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-[9px] font-bold uppercase tracking-wider ${i === 6 ? 'text-destructive/60' : 'text-muted-foreground'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayCol }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = dayData.get(dateStr);
            const isFriday = getDay(day) === 5;
            const isToday = isSameDay(day, new Date());
            const intensity = data ? getIntensity(data.totalTarget, maxTarget) : (isFriday ? 'bg-destructive/5 border-destructive/10' : 'bg-muted/20 border-border/30');

            return (
              <Tooltip key={dateStr}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !isFriday && onDayClick?.(dateStr)}
                    disabled={isFriday}
                    className={`aspect-square rounded-md border text-center flex flex-col items-center justify-center transition-all hover:ring-1 hover:ring-primary/30 ${intensity} ${isToday ? 'ring-2 ring-primary' : ''} ${isFriday ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? '' : ''}`}>{format(day, 'd')}</span>
                    {data && data.totalTarget > 0 && (
                      <span className="text-[7px] font-bold leading-tight">
                        {data.totalTarget > 999 ? `${(data.totalTarget / 1000).toFixed(1)}k` : data.totalTarget}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-bold">{format(day, 'EEE, MMM d')}</p>
                  {isFriday ? (
                    <p className="text-destructive">Off day (Friday)</p>
                  ) : data ? (
                    <>
                      <p>Target: <strong>{data.totalTarget.toLocaleString()}</strong></p>
                      <p>Lines: {data.lineCount}</p>
                      <p>Styles: {Array.from(data.styles).join(', ')}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No plans — click to add</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 justify-end mt-1">
          <span className="text-[9px] text-muted-foreground">Capacity:</span>
          {['bg-muted/30', 'bg-primary/10', 'bg-primary/25', 'bg-primary/45', 'bg-primary/70'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm border border-border/30 ${c}`} />
          ))}
          <span className="text-[9px] text-muted-foreground">High</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
