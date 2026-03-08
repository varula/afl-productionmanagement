import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  color: string;
  badge?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, color, badge, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pt-2 pb-1">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-1 h-5 rounded-full', color)} />
        <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
        {badge && (
          <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
