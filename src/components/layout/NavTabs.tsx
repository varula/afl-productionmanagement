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
  Scissors,
  Factory,
  Timer,
} from 'lucide-react';

interface TabDef {
  title: string;
  path: string;
  icon: any;
  badge?: number;
}

const tabs: TabDef[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Orders', path: '/plans', icon: ClipboardList, badge: 18 },
  { title: 'Floors & Lines', path: '/floors', icon: Layers },
  { title: 'Hourly Output', path: '/hourly-entry', icon: PenLine },
  { title: 'Lost Time', path: '/lost-time', icon: AlertTriangle, badge: 14 },
  { title: 'Workers', path: '/workers', icon: Users },
  { title: 'Machines', path: '/machines', icon: Cpu },
  { title: 'Quality Control', path: '/qc', icon: Shield, badge: 5 },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Shipments', path: '/shipments', icon: Ship },
  { title: 'Analytics', path: '/analytics', icon: LineChart },
  { title: 'MIS Reports', path: '/mis', icon: BarChart3 },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
];

export function NavTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-0.5 px-3 md:px-5 py-2 border-b border-border shrink-0 overflow-x-auto custom-scrollbar"
      style={{ scrollbarWidth: 'thin' }}
    >
      {tabs.map(tab => {
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`nav-tab ${active ? 'active' : ''}`}
          >
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">{tab.title}</span>
            {tab.badge !== undefined && (
              <span className={`text-[9px] font-bold px-1.5 py-0 rounded-full ml-0.5 ${
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
