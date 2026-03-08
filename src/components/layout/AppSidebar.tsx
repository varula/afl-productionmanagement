import {
  LayoutDashboard,
  ClipboardList,
  PenLine,
  BarChart3,
  FileText,
  Settings,
  Factory,
  LogOut,
  Layers,
  AlertTriangle,
  Users,
  Cpu,
  Shield,
  Package,
  LineChart,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const mainNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Orders', url: '/plans', icon: ClipboardList },
  { title: 'Planning', url: '/planning', icon: ClipboardList },
  { title: 'New Plan', url: '/plans/new', icon: PenLine },
  { title: 'Floors & Lines', url: '/floors', icon: Layers },
  { title: 'Hourly Output', url: '/hourly-entry', icon: PenLine },
  { title: 'Lost Time', url: '/lost-time', icon: AlertTriangle },
  { title: 'Workers', url: '/workers', icon: Users },
  { title: 'Machines', url: '/machines', icon: Cpu },
  { title: 'Quality Control', url: '/qc', icon: Shield },
  { title: 'Inventory', url: '/inventory', icon: Package },
  { title: 'Analytics', url: '/analytics', icon: LineChart },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'MIS Reports', url: '/mis', icon: BarChart3 },
];

const adminNav = [
  { title: 'Factory Setup', url: '/admin/factories', icon: Factory },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-4">
          <Factory className="h-7 w-7 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              GarmentIQ
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2">
          {!collapsed && user && (
            <p className="text-xs text-sidebar-foreground/60 truncate mb-2 px-2">
              {user.email}
            </p>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
