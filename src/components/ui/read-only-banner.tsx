import { Badge } from '@/components/ui/badge';
import { EyeOff } from 'lucide-react';

interface ReadOnlyBannerProps {
  message?: string;
}

export function ReadOnlyBanner({ message = 'You have view-only access. Contact an Admin or Manager to make changes.' }: ReadOnlyBannerProps) {
  return (
    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-4">
      <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{message}</span>
      <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400 ml-auto shrink-0">
        View Only
      </Badge>
    </div>
  );
}
