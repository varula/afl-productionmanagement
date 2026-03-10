import { useMemo } from 'react';
import { format, parseISO, differenceInDays, min, max } from 'date-fns';

interface GanttEntry {
  id: string;
  style: string;
  buyer: string;
  planCutDate: string | null;
  planSewDate: string | null;
  sewCompleteDate: string | null;
  washOutDate: string | null;
  washInHouseDate: string | null;
  washDeliveryDate: string | null;
  inspectionDate: string | null;
  shipDate: string | null;
  deliveryDate: string | null;
  status: string;
}

interface SeasonGanttChartProps {
  entries: GanttEntry[];
}

const PHASES = [
  { key: 'cutting', from: 'planCutDate', to: 'planSewDate', color: 'bg-amber-500', label: 'Cut' },
  { key: 'sewing', from: 'planSewDate', to: 'sewCompleteDate', color: 'bg-emerald-500', label: 'Sew' },
  { key: 'washing', from: 'washOutDate', to: 'washDeliveryDate', color: 'bg-blue-500', label: 'Wash' },
  { key: 'inspection', from: 'inspectionDate', to: 'shipDate', color: 'bg-purple-500', label: 'Inspect' },
  { key: 'shipping', from: 'shipDate', to: 'deliveryDate', color: 'bg-rose-500', label: 'Ship' },
] as const;

export function SeasonGanttChart({ entries }: SeasonGanttChartProps) {
  const { timelineStart, timelineEnd, totalDays, monthMarkers } = useMemo(() => {
    const allDates: Date[] = [];
    for (const e of entries) {
      for (const phase of PHASES) {
        const fromVal = e[phase.from as keyof GanttEntry] as string | null;
        const toVal = e[phase.to as keyof GanttEntry] as string | null;
        if (fromVal) allDates.push(parseISO(fromVal));
        if (toVal) allDates.push(parseISO(toVal));
      }
    }
    if (allDates.length === 0) {
      const now = new Date();
      return { timelineStart: now, timelineEnd: now, totalDays: 1, monthMarkers: [] };
    }

    const earliest = min(allDates);
    const latest = max(allDates);
    const total = Math.max(1, differenceInDays(latest, earliest) + 7); // +7 padding

    // Generate month markers
    const markers: { label: string; position: number }[] = [];
    const cur = new Date(earliest);
    cur.setDate(1);
    if (cur < earliest) cur.setMonth(cur.getMonth() + 1);
    while (cur <= latest) {
      const pos = differenceInDays(cur, earliest) / total * 100;
      markers.push({ label: format(cur, 'MMM yyyy'), position: pos });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { timelineStart: earliest, timelineEnd: latest, totalDays: total, monthMarkers: markers };
  }, [entries]);

  const getBarStyle = (fromDate: string | null, toDate: string | null) => {
    if (!fromDate) return null;
    const start = parseISO(fromDate);
    const end = toDate ? parseISO(toDate) : start;
    const left = (differenceInDays(start, timelineStart) / totalDays) * 100;
    const width = Math.max(1, (differenceInDays(end, start) / totalDays) * 100);
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  if (entries.length === 0) return null;

  return (
    <div className="space-y-0">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {PHASES.map(p => (
          <div key={p.key} className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${p.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline header */}
      <div className="relative h-6 border-b border-border/50 mb-1">
        {monthMarkers.map((m, i) => (
          <div key={i} className="absolute top-0 h-full flex flex-col items-start" style={{ left: `${m.position}%` }}>
            <div className="h-full w-px bg-border/50" />
            <span className="text-[9px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center gap-2 group hover:bg-muted/30 rounded py-1 px-1 transition-colors">
            {/* Label */}
            <div className="w-24 shrink-0">
              <p className="text-[10px] font-bold text-foreground truncate">{entry.style}</p>
              <p className="text-[9px] text-muted-foreground truncate">{entry.buyer}</p>
            </div>

            {/* Bars */}
            <div className="flex-1 relative h-5">
              {/* Grid lines */}
              {monthMarkers.map((m, i) => (
                <div key={i} className="absolute top-0 h-full w-px bg-border/20" style={{ left: `${m.position}%` }} />
              ))}

              {/* Phase bars */}
              {PHASES.map(phase => {
                const fromVal = entry[phase.from as keyof GanttEntry] as string | null;
                const toVal = entry[phase.to as keyof GanttEntry] as string | null;
                const style = getBarStyle(fromVal, toVal);
                if (!style) return null;
                return (
                  <div
                    key={phase.key}
                    className={`absolute top-0.5 h-4 rounded-sm ${phase.color} opacity-80 group-hover:opacity-100 transition-opacity`}
                    style={style}
                    title={`${phase.label}: ${fromVal ? format(parseISO(fromVal), 'MMM d') : '?'} → ${toVal ? format(parseISO(toVal), 'MMM d') : '?'}`}
                  >
                    {parseFloat(style.width) > 4 && (
                      <span className="text-[7px] text-white font-bold px-0.5 leading-4 truncate block">{phase.label}</span>
                    )}
                  </div>
                );
              })}

              {/* Today marker */}
              {(() => {
                const todayPos = (differenceInDays(new Date(), timelineStart) / totalDays) * 100;
                if (todayPos < 0 || todayPos > 100) return null;
                return <div className="absolute top-0 h-full w-px bg-destructive z-10" style={{ left: `${todayPos}%` }} />;
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
