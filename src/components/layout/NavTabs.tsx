import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  PenLine,
  BarChart3,
  Settings,
  Layers,
  AlertTriangle,
  Users,
  Cpu,
  Shield,
  Package,
  LineChart,
  Ship,
  Timer,
  Target,
  Ruler,
} from 'lucide-react';

interface TabDef {
  title: string;
  path: string;
  icon: any;
  badge?: number;
  exact?: boolean;
}

const tabs: TabDef[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Orders', path: '/plans', icon: ClipboardList, badge: 18, exact: true },
  { title: 'Planning', path: '/planning', icon: Target },
  { title: 'Floors & Lines', path: '/floors', icon: Layers },
  { title: 'Hourly Output', path: '/hourly-entry', icon: PenLine },
  { title: 'Lost Time', path: '/lost-time', icon: AlertTriangle, badge: 14 },
  { title: 'Workers', path: '/workers', icon: Users },
  { title: 'Machines', path: '/machines', icon: Cpu },
  { title: 'Quality Control', path: '/qc', icon: Shield, badge: 5 },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Shipments', path: '/shipments', icon: Ship },
  { title: 'Overtime', path: '/overtime', icon: Timer },
  { title: 'IE Module', path: '/ie', icon: Ruler },
  { title: 'Analytics', path: '/analytics', icon: LineChart },
  { title: 'MIS Reports', path: '/mis', icon: BarChart3 },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
];

export function NavTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: TabDef) => {
    if (tab.exact) return location.pathname === tab.path;
    return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
  };

  return (
    <div className="flex items-center gap-0.5 px-3 md:px-5 py-2 border-b border-border shrink-0 overflow-x-auto custom-scrollbar"
      style={{ scrollbarWidth: 'thin' }}
    >
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`nav-tab ${active ? 'active' : ''}`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{tab.title}</span>
            {tab.badge !== undefined && (
              <span className={`text-xs font-semibold px-1.5 py-0 rounded-full ml-0.5 ${
                active ? 'bg-primary-foreground/30 text-primary-foreground' : 'bg-pink text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
