import { Search } from 'lucide-react';

interface TopBarProps {
  selectedFactoryId: string;
  onFactoryChange: (id: string) => void;
}

export function TopBar({ selectedFactoryId, onFactoryChange }: TopBarProps) {
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
    </div>
  );
}
