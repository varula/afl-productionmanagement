import { useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

type SidebarConfig = Record<string, SidebarGroup[]>;

const STATIC_SIDEBAR_CONFIG: SidebarConfig = {
  '/dashboard': [
    { title: 'Quick Reports', items: [
      { label: 'Production Summary', key: 'dash-default', active: true },
      { label: 'Daily Output Report', key: 'dash-output' },
      { label: 'Order Status Overview', key: 'dash-orderstatus' },
      { label: 'Shipment Tracker', key: 'dash-shipments' },
      { label: 'Delay Analysis', key: 'dash-delays', badge: 4 },
      { label: 'Line Efficiency', key: 'dash-lineeff' },
      { label: 'Attendance Log', key: 'dash-attendance' },
      { label: 'Machine Status', key: 'dash-machines' },
      { label: 'QC Summary', key: 'dash-qcsummary' },
      { label: 'Buyer Performance', key: 'dash-buyers' },
      { label: 'Inventory Snapshot', key: 'dash-inventory' },
      { label: 'Period Comparison', key: 'dash-period' },
    ]},
  ],
  '/plans': [
    { title: 'By Buyer', items: [
      { label: 'All Orders', key: 'ord-all', active: true },
      { label: 'Gap', key: 'ord-gap' },
      { label: 'Lager 157', key: 'ord-lager157' },
      { label: 'UCB', key: 'ord-ucb' },
      { label: 'ZXY', key: 'ord-zxy' },
      { label: 'Cubus', key: 'ord-cubus' },
    ]},
    { title: 'By Stage', items: [
      { label: 'All Stages', key: 'stg-all' },
      { label: 'Cutting', key: 'stg-cutting' },
      { label: 'Sewing', key: 'stg-sewing' },
      { label: 'QC Hold', key: 'stg-qchold', badge: 5 },
      { label: 'Finishing', key: 'stg-finishing' },
      { label: 'Packing', key: 'stg-packing' },
      { label: 'Delayed', key: 'stg-delayed', badge: 4 },
    ]},
    { title: 'By Priority', items: [
      { label: 'High Priority', key: 'pri-high', badge: 8 },
      { label: 'Medium', key: 'pri-medium' },
      { label: 'Low', key: 'pri-low' },
    ]},
  ],
  '/floors': [
    { title: 'Sewing Floors', items: [
      { label: 'All Floors Overview', key: 'fl-all', active: true },
      { label: 'SF-01 (Lines 1–4)', key: 'fl-sf01' },
      { label: 'SF-02 (Lines 5–8)', key: 'fl-sf02' },
      { label: 'SF-03 (Lines 9–12)', key: 'fl-sf03' },
    ]},
    { title: 'Finishing Floors', items: [
      { label: 'FF-01 (Lines F1–F2)', key: 'fl-ff01' },
      { label: 'FF-02 (Lines F3–F4)', key: 'fl-ff02' },
    ]},
    { title: 'Cutting Floor', items: [
      { label: 'CF-01 (C1–C3)', key: 'fl-cf01' },
    ]},
    { title: 'Line Status', items: [
      { label: 'All Running', key: 'lstat-running' },
      { label: 'Delayed', key: 'lstat-delayed', badge: 1 },
      { label: 'QC Hold', key: 'lstat-qchold', badge: 1 },
    ]},
  ],
  '/lost-time': [
    { title: 'Filter By', items: [
      { label: 'All Incidents', key: 'lt-all', active: true },
      { label: 'Open / Unresolved', key: 'lt-open', badge: 2 },
      { label: 'Resolved Today', key: 'lt-resolved' },
      { label: 'High Impact (>30 min)', key: 'lt-high', badge: 3 },
    ]},
    { title: 'By Reason', items: [
      { label: 'Machine Breakdown', key: 'lt-machine', badge: 4 },
      { label: 'No Input / WIP Wait', key: 'lt-noinput', badge: 3 },
      { label: 'QC Hold', key: 'lt-qchold', badge: 1 },
      { label: 'Power / Utility', key: 'lt-power', badge: 1 },
      { label: 'Needle / Thread', key: 'lt-needle', badge: 3 },
      { label: 'Style Change / Setup', key: 'lt-style', badge: 1 },
      { label: 'Meeting / Planned', key: 'lt-meeting', badge: 1 },
    ]},
    { title: 'By Floor', items: [
      { label: 'SF-01 (Lines 1–4)', key: 'lt-sf01' },
      { label: 'SF-02 (Lines 5–8)', key: 'lt-sf02', badge: 3 },
      { label: 'SF-03 (Lines 9–12)', key: 'lt-sf03', badge: 3 },
      { label: 'FF-01 (F1–F2)', key: 'lt-ff01' },
      { label: 'FF-02 (F3–F4)', key: 'lt-ff02', badge: 2 },
      { label: 'CF-01 (Tables)', key: 'lt-cf01', badge: 1 },
    ]},
  ],
  '/workers': [
    { title: 'By Floor', items: [
      { label: 'All Workers (1,900)', key: 'wk-all', active: true },
      { label: 'SF-01 (480)', key: 'wk-sf01' },
      { label: 'SF-02 (472)', key: 'wk-sf02' },
      { label: 'SF-03 (468)', key: 'wk-sf03' },
      { label: 'FF-01 (200)', key: 'wk-ff01' },
      { label: 'FF-02 (190)', key: 'wk-ff02' },
      { label: 'CF-01 (190)', key: 'wk-cf01' },
    ]},
    { title: 'By Status', items: [
      { label: 'Present (1,824)', key: 'wk-present' },
      { label: 'Absent (76)', key: 'wk-absent', badge: 76 },
      { label: 'On Leave (22)', key: 'wk-leave' },
      { label: 'Training (22)', key: 'wk-training', badge: 22 },
    ]},
    { title: 'By Shift', items: [
      { label: 'Morning Shift', key: 'wk-morning' },
      { label: 'Evening Shift', key: 'wk-evening' },
      { label: 'Overtime List', key: 'wk-overtime' },
    ]},
  ],
  '/machines': [
    { title: 'By Floor', items: [
      { label: 'All Machines (648)', key: 'mc-all', active: true },
      { label: 'SF-01 (156)', key: 'mc-sf01' },
      { label: 'SF-02 (152)', key: 'mc-sf02' },
      { label: 'SF-03 (148)', key: 'mc-sf03' },
      { label: 'FF-01 (68)', key: 'mc-ff01' },
      { label: 'FF-02 (62)', key: 'mc-ff02' },
      { label: 'CF-01 (62)', key: 'mc-cf01' },
    ]},
    { title: 'By Status', items: [
      { label: 'Running (621)', key: 'mcs-running' },
      { label: 'Maintenance (5)', key: 'mcs-maint', badge: 5 },
      { label: 'Breakdown (5)', key: 'mcs-breakdown', badge: 5 },
      { label: 'Idle (0)', key: 'mcs-idle' },
    ]},
    { title: 'By Type', items: [
      { label: 'Lockstitch', key: 'mct-lockstitch' },
      { label: 'Overlock', key: 'mct-overlock' },
      { label: 'Flatlock', key: 'mct-flatlock' },
      { label: 'Cutting Machines', key: 'mct-cutting' },
      { label: 'Pressing', key: 'mct-pressing' },
      { label: 'Embroidery', key: 'mct-embroidery' },
    ]},
  ],
  '/qc': [
    { title: 'Inspection', items: [
      { label: 'All Inspections', key: 'qc-all', active: true },
      { label: "Today's Log", key: 'qc-today' },
      { label: 'Pending', key: 'qc-pending', badge: 5 },
      { label: 'Failed', key: 'qc-failed', badge: 8 },
      { label: 'Passed', key: 'qc-passed' },
      { label: 'On Hold', key: 'qc-hold', badge: 5 },
    ]},
    { title: 'By Floor', items: [
      { label: 'SF-01 Inline', key: 'qcf-sf01' },
      { label: 'SF-02 Inline', key: 'qcf-sf02' },
      { label: 'SF-03 Inline', key: 'qcf-sf03' },
      { label: 'FF-01 Final', key: 'qcf-ff01' },
      { label: 'FF-02 Final', key: 'qcf-ff02' },
      { label: 'Shipment Audit', key: 'qcf-shipment' },
    ]},
    { title: 'Defect Types', items: [
      { label: 'Stitch Skip', key: 'qcd-stitchskip' },
      { label: 'Measurement', key: 'qcd-measurement' },
      { label: 'Fabric Shade', key: 'qcd-shade' },
      { label: 'Thread Hanging', key: 'qcd-thread' },
      { label: 'Press Mark', key: 'qcd-pressmark' },
      { label: 'Zip Defect', key: 'qcd-zip' },
    ]},
  ],
  '/inventory': [
    { title: 'Categories', items: [
      { label: 'All Materials (128)', key: 'inv-all', active: true },
      { label: 'Fabrics (52)', key: 'inv-fabric' },
      { label: 'Accessories (22)', key: 'inv-accessories' },
      { label: 'Packaging (16)', key: 'inv-packaging' },
      { label: 'Critical Stock (9)', key: 'inv-critical', badge: 9 },
      { label: 'Low Stock (9)', key: 'inv-low', badge: 9 },
    ]},
    { title: 'By Buyer', items: [
      { label: 'Gap Materials', key: 'invb-gap' },
      { label: 'Lager 157', key: 'invb-lager157' },
      { label: 'UCB', key: 'invb-ucb' },
      { label: 'ZXY', key: 'invb-zxy' },
      { label: 'Cubus', key: 'invb-cubus' },
    ]},
    { title: 'Suppliers', items: [
      { label: 'Bengal Knitting', key: 'invs-bengal' },
      { label: 'Meghna Textiles', key: 'invs-meghna' },
      { label: 'YKK Bangladesh', key: 'invs-ykk' },
      { label: 'PrintPack BD', key: 'invs-printpack' },
    ]},
  ],
  '/analytics': [
    { title: 'Metrics', items: [
      { label: 'Overview', key: 'an-overview', active: true },
      { label: 'Production KPIs', key: 'an-production' },
      { label: 'Floor Efficiency', key: 'an-flooreff' },
      { label: 'Quality Trends', key: 'an-quality' },
      { label: 'Workforce Analytics', key: 'an-workforce' },
      { label: 'Machine Uptime', key: 'an-machine' },
      { label: 'Buyer Analysis', key: 'an-buyers' },
    ]},
    { title: 'Period', items: [
      { label: 'Today', key: 'anp-today' },
      { label: 'This Week', key: 'anp-week' },
      { label: 'This Month', key: 'anp-month' },
      { label: 'Last 3 Months', key: 'anp-3m' },
      { label: 'YTD 2026', key: 'anp-ytd' },
    ]},
  ],
  '/mis': [
    { title: 'Reports', items: [
      { label: 'All MIS Reports', key: 'mis-all', active: true },
      { label: 'Cost per Piece', key: 'mis-cpp' },
      { label: 'SAM Earned', key: 'mis-sam' },
      { label: 'Revenue per Line', key: 'mis-revenue' },
      { label: 'Waste %', key: 'mis-waste' },
    ]},
    { title: 'Report Type', items: [
      { label: 'Daily Production', key: 'rp-production' },
      { label: 'QC Reports', key: 'rp-qc' },
      { label: 'Shipment', key: 'rp-shipment' },
      { label: 'Attendance', key: 'rp-attendance' },
      { label: 'Inventory', key: 'rp-inventory' },
      { label: 'Machine', key: 'rp-machine' },
      { label: 'Buyer Reports', key: 'rp-buyer' },
    ]},
    { title: 'Period', items: [
      { label: 'This Week', key: 'misp-week' },
      { label: 'This Month', key: 'misp-month' },
      { label: 'Last 3 Months', key: 'misp-3m' },
    ]},
  ],
  '/admin/settings': [
    { title: 'Config', items: [
      { label: 'Company Profile', key: 'st-company', active: true },
      { label: 'Floor & Line Setup', key: 'st-floors' },
      { label: 'Shift Config', key: 'st-shift' },
      { label: 'KPI Targets', key: 'st-kpi' },
      { label: 'Notifications', key: 'st-notif' },
      { label: 'User Management', key: 'st-users' },
      { label: 'Integrations', key: 'st-integrations' },
      { label: 'Audit Log', key: 'st-audit' },
      { label: 'Backup & Export', key: 'st-backup' },
    ]},
  ],
  '/shipments': [
    { title: 'Status', items: [
      { label: 'All Shipments', key: 'sh-all', active: true },
      { label: 'Pending / Packed', key: 'sh-pending' },
      { label: 'In Transit', key: 'sh-intransit' },
      { label: 'Delivered', key: 'sh-delivered' },
      { label: 'Delayed', key: 'sh-delayed', badge: 2 },
    ]},
    { title: 'By Buyer', items: [
      { label: 'Gap', key: 'sh-gap' },
      { label: 'Lager 157', key: 'sh-lager157' },
      { label: 'UCB', key: 'sh-ucb' },
      { label: 'ZXY', key: 'sh-zxy' },
      { label: 'Cubus', key: 'sh-cubus' },
    ]},
  ],
  '/admin/factories': [
    { title: 'Setup', items: [
      { label: 'All Factories', key: 'fs-all', active: true },
      { label: 'Add Factory', key: 'fs-add' },
      { label: 'Floors & Lines', key: 'fs-floors' },
      { label: 'Shift Templates', key: 'fs-shifts' },
    ]},
  ],
};

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

  if (!floorsWithLines || floorsWithLines.length === 0) {
    return STATIC_SIDEBAR_CONFIG['/hourly-entry'] || [];
  }

  const viewByItems: SidebarItem[] = [
    { label: 'All Lines', key: 'hr-all', active: true },
    { label: 'Sewing', key: 'hr-sewing' },
    { label: 'Finishing', key: 'hr-finishing' },
    { label: 'Cutting', key: 'hr-cutting' },
    { label: 'Auxiliary (Bartack/Eyelet)', key: 'hr-auxiliary' },
  ];

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

interface ContextSidebarProps {
  activeFilter: string;
  onFilterChange: (key: string) => void;
  factoryId?: string;
}

export function ContextSidebar({ activeFilter, onFilterChange, factoryId = '' }: ContextSidebarProps) {
  const location = useLocation();
  const hourlyGroups = useHourlyEntrySidebar(factoryId);

  const isHourlyEntry = location.pathname === '/hourly-entry';
  const groups = isHourlyEntry ? hourlyGroups : (STATIC_SIDEBAR_CONFIG[location.pathname] || []);

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
      </ScrollArea>
    </div>
  );
}

export function getDefaultFilter(pathname: string): string {
  if (pathname === '/hourly-entry') return 'hr-all';
  const groups = STATIC_SIDEBAR_CONFIG[pathname] || [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.active) return item.key;
    }
  }
  return '';
}