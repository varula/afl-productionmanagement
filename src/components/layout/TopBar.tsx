import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronDown } from 'lucide-react';

interface TopBarProps {
  selectedFactoryId: string;
  onFactoryChange: (id: string) => void;
}

export function TopBar({ selectedFactoryId, onFactoryChange }: TopBarProps) {
  const [factoryOpen, setFactoryOpen] = useState(false);
  const factoryRef = useRef<HTMLDivElement>(null);

  const { data: factories = [] } = useQuery({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data } = await supabase.from('factories').select('*').order('name');
      return data ?? [];
    },
  });

  const selectedFactory = factories.find(f => f.id === selectedFactoryId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (factoryRef.current && !factoryRef.current.contains(e.target as Node)) setFactoryOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2.5 border-b border-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary to-purple flex items-center justify-center shrink-0">
          <span className="text-[11px] font-extrabold text-primary-foreground tracking-tight">AG</span>
        </div>
        <div className="hidden md:block">
          <div className="text-[13px] font-extrabold text-foreground leading-tight">Armana Fashions Limited</div>
          <div className="text-[9px] text-muted-foreground font-medium">Integrated Production Management System</div>
        </div>
      </div>

      {/* Search */}
      <div className="hidden lg:flex flex-1 max-w-[240px] items-center gap-2 bg-muted border border-border rounded-[9px] px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search orders, workers, styles…"
          className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-[inherit]"
        />
      </div>

      {/* Factory Switcher */}
      <div className="relative shrink-0" ref={factoryRef}>
        <button
          onClick={() => setFactoryOpen(!factoryOpen)}
          className="flex items-center gap-2 border border-border rounded-[9px] px-2 md:px-2.5 py-1.5 bg-muted text-xs font-medium text-foreground hover:border-primary transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-success shrink-0" />
          <span className="hidden sm:inline max-w-[140px] md:max-w-[180px] truncate">
            {selectedFactory?.name || 'Select Factory'}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>

        {factoryOpen && factories.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 min-w-[280px] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden p-1">
            {factories.map(f => (
              <button
                key={f.id}
                onClick={() => { onFactoryChange(f.id); setFactoryOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-colors text-left ${
                  f.id === selectedFactoryId ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{f.name}</div>
                  {f.location && <div className="text-[10px] text-muted-foreground truncate">{f.location}</div>}
                </div>
                {f.id === selectedFactoryId && (
                  <span className="text-[9px] font-bold text-success-foreground bg-success rounded-[5px] px-1.5 py-0.5 shrink-0">Current</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
