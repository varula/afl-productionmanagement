import { useState, useRef, useEffect } from 'react';
import { Search, LogOut, User, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface TopBarProps {
  selectedFactoryId: string;
  onFactoryChange: (id: string) => void;
}

export function TopBar({ selectedFactoryId, onFactoryChange }: TopBarProps) {
  const { user, roles, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const primaryRole = roles[0] || 'operator';
  const roleLabel = primaryRole.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-background tracking-tight">AG</span>
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-semibold text-foreground leading-tight tracking-tight">Armana Fashions</div>
          <div className="text-xs text-muted-foreground font-normal">Production System</div>
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
      <button className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors">
        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink" />
      </button>

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
            {/* Profile header */}
            <div className="px-3 py-2.5 border-b border-border/40 mb-1">
              <div className="text-sm font-semibold text-foreground">{displayName}</div>
              <div className="text-xs text-muted-foreground">{user?.email || 'admin@test.com'}</div>
              <Badge variant="outline" className="mt-1.5 text-[10px] bg-primary/10 text-primary border-primary/30">{roleLabel}</Badge>
            </div>

            {/* Menu items */}
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">My Profile</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Settings</span>
            </button>

            <div className="border-t border-border/40 mt-1 pt-1">
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-pink/10 transition-colors text-left"
              >
                <LogOut className="h-4 w-4 text-pink" />
                <span className="text-sm text-pink font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}