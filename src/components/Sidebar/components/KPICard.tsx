import { memo } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { KPIValue, KPIStatus } from '../utils/kpiCalculations';
import { cn } from '@/lib/utils';

interface KPICardProps {
  kpi: KPIValue;
}

const statusColors: Record<KPIStatus, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

export const KPICard = memo(function KPICard({ kpi }: KPICardProps) {
  const colors = statusColors[kpi.status];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {kpi.title}
            </span>
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Info about ${kpi.title}`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">{kpi.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={cn('text-xl font-bold', colors.text)}>
            {kpi.formatted}
          </div>
        </div>
      </div>
    </div>
  );
});
