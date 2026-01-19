import { memo } from 'react';
import { TooltipContent } from '@/components/ui/tooltip';
import { formatTimeRange } from '@/components/Timeline/utils/timeCalculations';
import type { Reservation, ReservationStatus } from '@/types/models';

interface ReservationTooltipProps {
  reservation: Pick<
    Reservation,
    'customer' | 'partySize' | 'startTime' | 'endTime' | 'notes' | 'status'
  >;
}

function formatStatus(status: ReservationStatus): string {
  return status.toLowerCase().replace('_', ' ');
}

export const ReservationTooltip = memo(function ReservationTooltip({
  reservation,
}: ReservationTooltipProps) {
  return (
    <TooltipContent side="top" className="max-w-xs">
      <div className="space-y-1">
        <p className="font-medium">{reservation.customer.name}</p>
        <p className="text-sm text-muted-foreground">{reservation.customer.phone}</p>
        <p className="text-sm">
          {reservation.partySize} guests •{' '}
          {formatTimeRange(reservation.startTime, reservation.endTime)}
        </p>
        {reservation.notes && (
          <p className="text-sm text-muted-foreground">{reservation.notes}</p>
        )}
        <p className="text-xs text-muted-foreground capitalize">
          Status: {formatStatus(reservation.status)}
        </p>
      </div>
    </TooltipContent>
  );
});
