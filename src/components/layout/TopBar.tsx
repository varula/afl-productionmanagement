import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronDown, Check } from 'lucide-react';

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

      {/* Factory Switcher */}
      <div className="relative shrink-0" ref={factoryRef}>
        <button
          onClick={() => setFactoryOpen(!factoryOpen)}
          className="flex items-center gap-2 border border-border/50 rounded-xl px-3 py-2 bg-muted/40 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-success shrink-0" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {selectedFactory?.name || 'Select Factory'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {factoryOpen && factories.length > 0 && (
          <div className="absolute top-full mt-2 right-0 min-w-[280px] bg-card border border-border/60 rounded-2xl shadow-lg shadow-black/8 z-50 overflow-hidden p-1.5">
            {factories.map(f => (
              <button
                key={f.id}
                onClick={() => { onFactoryChange(f.id); setFactoryOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-colors text-left ${
                  f.id === selectedFactoryId ? 'bg-primary/8' : 'hover:bg-muted/60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{f.name}</div>
                  {f.location && <div className="text-[11px] text-muted-foreground truncate">{f.location}</div>}
                </div>
                {f.id === selectedFactoryId && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
