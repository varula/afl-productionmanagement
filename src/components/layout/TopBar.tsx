import { useState, useRef, useEffect } from 'react';
import { Search, LogOut, User, Settings, Bell, AlertTriangle, TrendingDown, ShieldAlert, Users, Truck, Cpu, ArrowLeftRight, Gauge, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  selectedFactoryId: string;
  onFactoryChange: (id: string) => void;
}

const ALERT_ICONS: Record<string, React.ElementType> = {
  downtime_exceeded: AlertTriangle,
  efficiency_below_target: TrendingDown,
  quality_dhu_high: ShieldAlert,
  absenteeism_high: Users,
  shipment_delayed: Truck,
  machine_breakdown: Cpu,
  style_changeover: ArrowLeftRight,
  low_output_hour: Gauge,
};

const CATEGORY_COLORS: Record<string, string> = {
  production: 'bg-primary/15 text-primary',
  quality: 'bg-destructive/15 text-destructive',
  workforce: 'bg-accent text-accent-foreground',
  logistics: 'bg-secondary text-secondary-foreground',
};

export function TopBar({ selectedFactoryId, onFactoryChange }: TopBarProps) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const primaryRole = roles[0] || 'operator';
  const roleLabel = primaryRole.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const { data: alerts = [] } = useQuery({
    queryKey: ['alert-configurations-topbar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('is_enabled', true)
        .order('updated_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-background tracking-tight">AFL</span>
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-semibold text-foreground leading-tight tracking-tight">Armana Productivity 360</div>
          <div className="text-xs text-muted-foreground font-normal">Measure. Improve. Sustain.</div>
        </div>
      </div>

      {/* Search */}
      <div className="hidden lg:flex flex-1 max-w-[260px] items-center gap-2 bg-muted/60 border border-border/50 rounded-xl px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search…"
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      <div className="flex-1" />

      {/* Notification bell */}
      <div className="relative" ref={bellRef}>
        <button
          onClick={() => setBellOpen(!bellOpen)}
          className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {alerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
          )}
        </button>

        {bellOpen && (
          <div className="absolute top-full mt-2 right-0 w-[320px] bg-card border border-border/60 rounded-2xl shadow-lg shadow-black/8 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Active Alerts</span>
              <Badge variant="secondary" className="text-[10px]">{alerts.length}</Badge>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BellOff className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No active alerts</p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const Icon = ALERT_ICONS[alert.alert_type] || Bell;
                  const colors = CATEGORY_COLORS[alert.category] || 'bg-muted text-muted-foreground';
                  return (
                    <div
                      key={alert.id}
                      className="px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/20 last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-tight">{alert.label}</p>
                          <p className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-1">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] capitalize h-4 px-1.5">{alert.category}</Badge>
                            {alert.threshold_value != null && (
                              <span className="text-[9px] text-muted-foreground">
                                Threshold: {alert.threshold_value}{alert.threshold_unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-border/40">
              <button
                onClick={() => { setBellOpen(false); navigate('/admin/notifications'); }}
                className="text-xs text-primary hover:underline font-medium w-full text-center"
              >
                Manage Notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-foreground leading-tight">{displayName}</div>
            <div className="text-[10.5px] text-muted-foreground">{roleLabel}</div>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute top-full mt-2 right-0 min-w-[220px] bg-card border border-border/60 rounded-2xl shadow-lg shadow-black/8 z-50 overflow-hidden p-1.5">
            <div className="px-3 py-2.5 border-b border-border/40 mb-1">
              <div className="text-sm font-semibold text-foreground">{displayName}</div>
              <div className="text-xs text-muted-foreground">{user?.email || 'admin@test.com'}</div>
              <Badge variant="outline" className="mt-1.5 text-[10px] bg-primary/10 text-primary border-primary/30">{roleLabel}</Badge>
            </div>
            <button onClick={() => { setMenuOpen(false); navigate('/admin/users'); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">My Profile</span>
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Settings</span>
            </button>
            <div className="border-t border-border/40 mt-1 pt-1">
              <button onClick={() => { signOut(); setMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-left">
                <LogOut className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

