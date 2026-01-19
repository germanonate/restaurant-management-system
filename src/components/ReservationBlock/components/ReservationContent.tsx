import { memo } from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatTimeRange } from '@/components/Timeline/utils/timeCalculations';
import type { Priority } from '@/types/models';
import { PRIORITY_LABELS } from '@/types/models';
import { cn } from '@/lib/utils';

interface ReservationContentProps {
  customerName: string;
  partySize: number;
  startTime: string;
  endTime: string;
  priority: Priority;
  width: number;
  isCancelled: boolean;
}

export const ReservationContent = memo(function ReservationContent({
  customerName,
  partySize,
  startTime,
  endTime,
  priority,
  width,
  isCancelled,
}: ReservationContentProps) {
  return (
    <>
      {/* Content */}
      <div
        className={cn(
          'flex items-center gap-1.5 min-w-0 flex-1 pl-2',
          isCancelled ? 'text-gray-700' : 'text-white'
        )}
      >
        <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium" aria-hidden="true">
          {partySize}
        </span>
        <span className="text-sm font-medium truncate">{customerName}</span>
        {width > 120 && (
          <span className="text-xs opacity-80 shrink-0">
            {formatTimeRange(startTime, endTime)}
          </span>
        )}
      </div>

      {/* Priority badge */}
      {priority !== 'STANDARD' && width > 160 && (
        <Badge
          variant="secondary"
          className={cn(
            'text-xs shrink-0',
            isCancelled ? 'bg-gray-500/30 text-gray-700' : 'bg-white/20 text-white'
          )}
        >
          {PRIORITY_LABELS[priority]}
        </Badge>
      )}
    </>
  );
});
