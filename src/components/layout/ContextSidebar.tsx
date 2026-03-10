import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSidebarFilters, type FilterGroup } from '@/hooks/useSidebarFilters';
import { useFilterItemMutations } from '@/hooks/useSidebarFilters';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

interface SidebarItem {
  label: string;
  key: string;
  badge?: string | number;
  active?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const HOUR_LABELS = [
  '8–9 AM', '9–10 AM', '10–11 AM', '11–12 AM',
  '12–1 PM', '1–2 PM', '2–3 PM', '3–4 PM', '4–5 PM', '5–6 PM',
];

/** Build dynamic sidebar groups for /hourly-entry from actual floor/line data */
function useHourlyEntrySidebar(factoryId: string): SidebarGroup[] {
  const { data: floorsWithLines } = useQuery({
    queryKey: ['sidebar-floors-lines', factoryId],
    queryFn: async () => {
      let query = supabase
        .from('floors')
        .select('id, name, lines(id, line_number, type, is_active)')
        .order('floor_index');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
    enabled: !!factoryId,
  });

  const viewByItems: SidebarItem[] = [
    { label: 'All Lines', key: 'hr-all', active: true },
    { label: 'Sewing', key: 'hr-sewing' },
    { label: 'Finishing', key: 'hr-finishing' },
    { label: 'Cutting', key: 'hr-cutting' },
    { label: 'Auxiliary (Bartack/Eyelet)', key: 'hr-auxiliary' },
  ];

  if (floorsWithLines && floorsWithLines.length > 0) {
    for (const floor of floorsWithLines) {
      const activeLines = (floor.lines || []).filter((l: any) => l.is_active);
      if (activeLines.length === 0) continue;
      const lineNums = activeLines.map((l: any) => l.line_number).sort((a: number, b: number) => a - b);
      const primaryType = activeLines[0]?.type || 'sewing';
      const unitWord = primaryType === 'cutting' ? 'Table' : primaryType === 'auxiliary' ? 'AX' : 'Line';
      const unitWordPlural = primaryType === 'cutting' ? 'Tables' : primaryType === 'auxiliary' ? 'AX' : 'Lines';
      const rangeLabel = lineNums.length === 1
        ? `${unitWord} ${lineNums[0]}`
        : `${unitWordPlural} ${lineNums[0]}–${lineNums[lineNums.length - 1]}`;
      viewByItems.push({
        label: `${floor.name} (${rangeLabel})`,
        key: `hr-floor-${floor.id}`,
        badge: activeLines.length,
      });
    }
  }

  const hourItems: SidebarItem[] = HOUR_LABELS.map((label, i) => ({
    label,
    key: `hr-h${i + 1}`,
  }));

  const performanceItems: SidebarItem[] = [
    { label: 'Below Target (<100%)', key: 'hr-below-target' },
    { label: 'On/Above Target (≥100%)', key: 'hr-on-target' },
  ];

  return [
    { title: 'View By', items: viewByItems },
    { title: 'Performance', items: performanceItems },
    { title: 'Hour', items: hourItems },
  ];
}

/** Convert DB filter groups to sidebar groups */
function dbGroupsToSidebarGroups(dbGroups: FilterGroup[]): SidebarGroup[] {
  return dbGroups.map(g => ({
    title: g.title,
    items: g.items.map(i => ({
      label: i.label,
      key: i.filter_key,
      badge: i.badge_value ? (isNaN(Number(i.badge_value)) ? i.badge_value : Number(i.badge_value)) : undefined,
      active: i.is_default,
    })),
  }));
}

/** Inline quick-add dialog for admins */
function InlineAddFilter({ route, groups, onAdded }: { route: string; groups: FilterGroup[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const { addItem } = useFilterItemMutations();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1">
          <Plus className="h-3 w-3" /> Quick Add Filter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Quick Add Filter</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Group</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
            >
              <option value="">Select group...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Filter label" />
          </div>
          <div>
            <Label className="text-xs">Key</Label>
            <Input value={filterKey} onChange={e => setFilterKey(e.target.value)} placeholder="filter-key" />
          </div>
          <Button className="w-full" onClick={() => {
            if (!selectedGroupId || !label.trim() || !filterKey.trim()) { toast.error('Fill all fields'); return; }
            addItem.mutate({ group_id: selectedGroupId, label: label.trim(), filter_key: filterKey.trim(), sort_order: 99 }, {
              onSuccess: () => { toast.success('Filter added'); setOpen(false); setLabel(''); setFilterKey(''); onAdded(); },
              onError: (e: any) => toast.error(e.message),
            });
          }}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContextSidebarProps {
  activeFilter: string;
  onFilterChange: (key: string) => void;
  factoryId?: string;
}

export function ContextSidebar({ activeFilter, onFilterChange, factoryId = '' }: ContextSidebarProps) {
  const location = useLocation();
  const hourlyGroups = useHourlyEntrySidebar(factoryId);
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  const isHourlyEntry = location.pathname === '/hourly-entry';
  const { data: dbGroups = [], refetch } = useSidebarFilters(location.pathname);

  // For hourly-entry, use dynamic floor/line sidebar; otherwise use DB-driven filters
  const groups: SidebarGroup[] = isHourlyEntry
    ? hourlyGroups
    : dbGroupsToSidebarGroups(dbGroups);

  if (groups.length === 0) return null;

  return (
    <div className="hidden sm:block w-[180px] shrink-0 border-r border-border/50 overflow-hidden bg-card">
      <ScrollArea className="h-full py-4">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-3">
            <div className="px-4 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = activeFilter === item.key || (!activeFilter && item.active);
              return (
                <button
                  key={item.key}
                  onClick={() => onFilterChange(item.key)}
                  className={cn(
                    'w-full text-left px-4 py-[6px] text-sm transition-all flex items-center justify-between',
                    isActive
                      ? 'text-primary font-semibold bg-accent'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={cn(
                      'text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 bg-muted text-muted-foreground',
                      typeof item.badge === 'number' && item.badge > 10 && 'bg-pink/10 text-pink'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {/* Inline quick-add for admins */}
        {isAdmin && !isHourlyEntry && dbGroups.length > 0 && (
          <div className="px-2 mt-2 border-t border-border/50 pt-2">
            <InlineAddFilter route={location.pathname} groups={dbGroups} onAdded={() => refetch()} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function getDefaultFilter(pathname: string): string {
  // These are hardcoded defaults for initial load before DB loads
  const defaults: Record<string, string> = {
    '/hourly-entry': 'hr-all',
    '/planning': 'pl-dayplan',
    '/overtime': 'ot-analytics',
    '/ie': 'ie-skill',
    '/admin/users': 'usr-all',
    '/dashboard': 'dash-default',
    '/plans': 'ord-all',
    '/floors': 'fl-all',
    '/lost-time': 'lt-all',
    '/workers': 'wk-all',
    '/machines': 'mc-all',
    '/qc': 'qc-all',
    '/inventory': 'inv-all',
    '/analytics': 'an-overview',
    '/mis': 'mis-all',
    '/shipments': 'sh-all',
    '/admin/settings': 'st-company',
    '/admin/factories': 'fs-all',
  };
  return defaults[pathname] || '';
}
