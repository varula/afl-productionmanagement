import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface HourlyRecord {
  hour_slot: number;
  produced_qty: number;
  defects: number;
  checked_qty: number;
}

interface PlanWithHourly {
  id: string;
  target_qty: number;
  working_hours: number;
  lines: { line_number: number; type: string; floors: { name: string } };
  styles: { style_no: string; buyer?: string };
  hourly_records: HourlyRecord[];
}

const HOUR_HEADERS = [
  { slot: 1, label: 'Hr 1', sub: '8–9' },
  { slot: 2, label: 'Hr 2', sub: '9–10' },
  { slot: 3, label: 'Hr 3', sub: '10–11' },
  { slot: 4, label: 'Hr 4', sub: '11–12' },
  { slot: 5, label: 'Hr 5', sub: '12–1' },
  { slot: 6, label: 'Hr 6', sub: '2–3' },
  { slot: 7, label: 'Hr 7', sub: '3–4' },
  { slot: 8, label: 'Hr 8', sub: '4–5' },
  { slot: 9, label: 'OT', sub: '5–6' },
];

function getFloorCode(floorName: string, lineType: string, lineNum: number): string {
  if (lineType === 'cutting') return `CT`;
  if (lineType === 'finishing') {
    const fFloor = lineNum <= 2 ? 'FF-01' : 'FF-02';
    return fFloor;
  }
  // Sewing
  if (lineNum <= 4) return 'SF-01';
  if (lineNum <= 8) return 'SF-02';
  return 'SF-03';
}

function getLineLabel(lineType: string, lineNum: number): string {
  if (lineType === 'cutting') return `C${lineNum}`;
  if (lineType === 'finishing') return `F${lineNum}`;
  return `L${lineNum}`;
}

function getCellColor(produced: number, hourlyTarget: number): string {
  if (produced === 0) return 'bg-muted/50 text-muted-foreground';
  const pct = (produced / hourlyTarget) * 100;
  if (pct >= 100) return 'bg-success/80 text-success-foreground';
  if (pct >= 80) return 'bg-warning/70 text-warning-foreground';
  return 'bg-pink/70 text-pink-foreground';
}

function getEffColor(eff: number): string {
  if (eff >= 95) return 'text-success font-bold';
  if (eff >= 80) return 'text-warning font-bold';
  return 'text-destructive font-bold';
}

interface Props {
  plans: PlanWithHourly[];
  title: string;
  icon: string;
  defaultHourlyTarget: number;
  onCellClick?: (planId: string, hourSlot: number) => void;
}

export function HourlyTrackerTable({ plans, title, icon, defaultHourlyTarget, onCellClick }: Props) {
  if (plans.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Target: {defaultHourlyTarget.toLocaleString()} pcs/hr per line
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[120px] sticky left-0 bg-muted/30 z-10">Floor / Line</th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[130px]">Buyer · Style</th>
              {HOUR_HEADERS.map(h => (
                <th key={h.slot} className="text-center px-1 py-2 font-semibold text-muted-foreground w-[56px]">
                  <div>{h.label}</div>
                  <div className="text-[9px] font-normal">{h.sub}</div>
                </th>
              ))}
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-[64px]">Total</th>
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-[64px]">Target</th>
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-[52px]">Eff%</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const lineType = plan.lines?.type || 'sewing';
              const lineNum = plan.lines?.line_number || 0;
              const floorCode = getFloorCode(plan.lines?.floors?.name || '', lineType, lineNum);
              const lineLabel = getLineLabel(lineType, lineNum);
              const hourlyTarget = Math.round(plan.target_qty / (plan.working_hours || 8));
              const total = plan.hourly_records.reduce((s, r) => s + r.produced_qty, 0);
              const eff = plan.target_qty > 0 ? (total / plan.target_qty) * 100 : 0;
              const isBelowTarget = eff < 80;

              return (
                <tr key={plan.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">
                    <span className="flex items-center gap-1">
                      {isBelowTarget && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                      {floorCode} / {lineLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground truncate">
                    {plan.styles?.buyer ? `${plan.styles.buyer} · ` : ''}{plan.styles?.style_no}
                  </td>
                  {HOUR_HEADERS.map(h => {
                    const record = plan.hourly_records.find(r => r.hour_slot === h.slot);
                    const qty = record?.produced_qty || 0;
                    return (
                      <td key={h.slot} className="px-1 py-1.5 text-center">
                        <button
                          onClick={() => onCellClick?.(plan.id, h.slot)}
                          className={cn(
                            'w-full rounded-md py-1 text-xs font-semibold transition-colors cursor-pointer hover:opacity-80',
                            qty > 0 ? getCellColor(qty, hourlyTarget) : 'bg-muted/40 text-muted-foreground/50'
                          )}
                        >
                          {qty > 0 ? qty : '—'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-bold text-foreground">{total.toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-muted-foreground">{plan.target_qty.toLocaleString()}</td>
                  <td className={cn('px-2 py-2 text-center', getEffColor(eff))}>{eff.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
