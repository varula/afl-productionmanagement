import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  color?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, color, badge, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pt-1 pb-2">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h2>
        {badge && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
