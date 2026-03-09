import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Shirt } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface LineRunningDaysTabProps {
  factoryId: string;
  selectedDate: string;
  department: 'sewing' | 'finishing';
}

export function LineRunningDaysTab({ factoryId, selectedDate, department }: LineRunningDaysTabProps) {
  // Get all plans to compute running days per line/style
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['line-running-days', factoryId, department],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors?.length) return [];
      const { data: lineData } = await supabase.from('lines').select('id').eq('type', department).in('floor_id', floors.map(f => f.id));
      if (!lineData?.length) return [];
      const { data, error } = await supabase
        .from('production_plans')
        .select('date, line_id, style_id, lines(line_number, type, floors(name)), styles(style_no, buyer, smv)')
        .in('line_id', lineData.map(l => l.id))
        .order('date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  // Group by line+style and compute running days
  const lineStyleData = useMemo(() => {
    const map = new Map<string, { lineId: string; styleId: string; line: any; style: any; dates: string[] }>();
    for (const p of plans as any[]) {
      const key = `${p.line_id}__${p.style_id}`;
      if (!map.has(key)) {
        map.set(key, { lineId: p.line_id, styleId: p.style_id, line: p.lines, style: p.styles, dates: [] });
      }
      map.get(key)!.dates.push(p.date);
    }
    // Compute running days and sort
    return Array.from(map.values()).map(item => {
      const uniqueDates = [...new Set(item.dates)].sort();
      const firstDate = uniqueDates[0];
      const lastDate = uniqueDates[uniqueDates.length - 1];
      const runningDays = uniqueDates.length;
      const calendarDays = differenceInDays(parseISO(lastDate), parseISO(firstDate)) + 1;
      const isActive = lastDate >= selectedDate;
      return { ...item, runningDays, calendarDays, firstDate, lastDate, isActive };
    }).sort((a, b) => {
      // Active first, then by line number
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (a.line?.line_number || 0) - (b.line?.line_number || 0);
    });
  }, [plans, selectedDate]);

  const activeCount = lineStyleData.filter(d => d.isActive).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-[1.5px] border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-foreground">{lineStyleData.length}</p>
            <p className="text-[10.5px] text-muted-foreground font-medium">Line × Style Combos</p>
          </CardContent>
        </Card>
        <Card className="border-[1.5px] border-success/20">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-foreground">{activeCount}</p>
            <p className="text-[10.5px] text-muted-foreground font-medium">Currently Active</p>
          </CardContent>
        </Card>
        <Card className="border-[1.5px] border-warning/20">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-extrabold text-foreground">{lineStyleData.length - activeCount}</p>
            <p className="text-[10.5px] text-muted-foreground font-medium">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[1.5px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" /> Line × Style Running Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Line', 'Floor', 'Style', 'Buyer', 'SMV', 'First Date', 'Last Date', 'Running Days', 'Calendar Days', 'Status'].map(h => (
                    <th key={h} className={`py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ${['Running Days', 'Calendar Days', 'SMV'].includes(h) ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
                ) : lineStyleData.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-muted-foreground text-sm">No line/style data found. Create day plans first.</td></tr>
                ) : lineStyleData.map((item, i) => (
                  <tr key={`${item.lineId}-${item.styleId}`} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3"><Badge variant="outline" className="text-[10px] font-bold">L{item.line?.line_number}</Badge></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{item.line?.floors?.name || '—'}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{item.style?.style_no || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{item.style?.buyer || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{item.style?.smv || '—'}</td>
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{item.firstDate}</td>
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{item.lastDate}</td>
                    <td className="py-2 px-3 text-right font-bold text-foreground">{item.runningDays}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{item.calendarDays}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${item.isActive ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground'}`}>
                        {item.isActive ? 'Active' : 'Done'}
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
