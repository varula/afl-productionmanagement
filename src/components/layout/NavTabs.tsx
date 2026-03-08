import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  PenLine,
  BarChart3,
  FileText,
  Factory,
  Settings,
  Layers,
  Clock,
  AlertTriangle,
  Users,
  Cpu,
  Shield,
  Package,
  LineChart,
  Mail,
} from 'lucide-react';

const tabs = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Orders', path: '/plans', icon: ClipboardList },
  { title: 'Floors & Lines', path: '/floors', icon: Layers },
  { title: 'Hourly Output', path: '/hourly-entry', icon: PenLine, badge: undefined },
  { title: 'Lost Time', path: '/lost-time', icon: AlertTriangle, badge: undefined },
  { title: 'Workers', path: '/workers', icon: Users },
  { title: 'Machines', path: '/machines', icon: Cpu },
  { title: 'Quality Control', path: '/qc', icon: Shield },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Analytics', path: '/analytics', icon: LineChart },
  { title: 'Reports', path: '/reports', icon: FileText },
  { title: 'MIS Reports', path: '/mis', icon: BarChart3 },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
];

export function NavTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-0.5 px-5 py-2 border-b border-border shrink-0 overflow-x-auto custom-scrollbar">
      {tabs.map(tab => {
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`nav-tab ${active ? 'active' : ''}`}
          >
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">{tab.title}</span>
            {tab.badge !== undefined && (
              <span className={`text-[9px] font-bold px-1.5 py-0 rounded-full ml-0.5 ${
                active ? 'bg-primary-foreground/30 text-primary-foreground' : 'bg-pink text-pink-foreground'
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
