import { memo, useCallback, useState, useRef } from 'react';
import { Users, Crown, UsersRound, GripVertical } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservations } from '@/hooks/useReservations';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ReservationContextMenu } from './ReservationContextMenu';
import { ReservationSheet } from './ReservationSheet';
import {
  getReservationPosition,
  getReservationWidth,
  formatTimeRange,
  ROW_HEIGHT,
} from '@/utils/timeCalculations';
import type { Reservation, Priority } from '@/types/models';
import { RESERVATION_STATUS_COLORS, PRIORITY_LABELS } from '@/types/models';
import { cn } from '@/lib/utils';

interface ReservationBlockProps {
  reservation: Reservation;
  rowIndex: number;
  slotWidth: number;
}

const PriorityIcon = memo(function PriorityIcon({
  priority,
}: {
  priority: Priority;
}) {
  switch (priority) {
    case 'VIP':
      return <Crown className="h-3 w-3 text-amber-500" aria-label="VIP" />;
    case 'LARGE_GROUP':
      return (
        <UsersRound
          className="h-3 w-3 text-purple-500"
          aria-label="Large group"
        />
      );
    default:
      return null;
  }
});

export const ReservationBlock = memo(function ReservationBlock({
  reservation,
  rowIndex,
  slotWidth,
}: ReservationBlockProps) {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const blockRef = useRef<HTMLDivElement>(null);

  const {
    updateReservation,
    deleteReservation,
    duplicateReservation,
    confirmReservation,
    seatReservation,
    finishReservation,
    markNoShow,
    cancelReservation,
  } = useReservations();

  const {
    handleMoveDragStart,
    handleResizeDragStart,
    dragState,
  } = useDragAndDrop();

  const [sheetOpen, setSheetOpen] = useState(false);

  const left = getReservationPosition(
    reservation.startTime,
    selectedDate,
    slotWidth
  );
  const width = getReservationWidth(reservation.durationMinutes, slotWidth);
  const top = rowIndex * ROW_HEIGHT;

  const statusColor = RESERVATION_STATUS_COLORS[reservation.status];
  const isCancelled = reservation.status === 'CANCELLED';

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const rect = blockRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;

      // Check if clicking on resize handles
      const blockRect = blockRef.current?.getBoundingClientRect();
      if (blockRect) {
        const relativeX = e.clientX - blockRect.left;
        const isLeftEdge = relativeX < 12;
        const isRightEdge = relativeX > blockRect.width - 12;

        if (isLeftEdge) {
          handleResizeDragStart(reservation.id, 'start', e.clientX, rect);
          return;
        }
        if (isRightEdge) {
          handleResizeDragStart(reservation.id, 'end', e.clientX, rect);
          return;
        }
      }

      handleMoveDragStart(reservation.id, reservation.tableId, e.clientX, rect);
    },
    [reservation.id, reservation.tableId, handleMoveDragStart, handleResizeDragStart]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSheetOpen(true);
    },
    []
  );

  const handleEdit = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    deleteReservation(reservation.id);
  }, [reservation.id, deleteReservation]);

  const handleDuplicate = useCallback(() => {
    duplicateReservation(reservation.id);
  }, [reservation.id, duplicateReservation]);

  const handleUpdateReservation = useCallback(
    (data: Parameters<typeof updateReservation>[1]) => {
      return updateReservation(reservation.id, data);
    },
    [reservation.id, updateReservation]
  );

  const isBeingDragged =
    dragState.isDragging && dragState.reservationId === reservation.id;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <ReservationContextMenu
          reservation={reservation}
          onEdit={handleEdit}
          onConfirm={() => confirmReservation(reservation.id)}
          onSeat={() => seatReservation(reservation.id)}
          onFinish={() => finishReservation(reservation.id)}
          onNoShow={() => markNoShow(reservation.id)}
          onCancel={() => cancelReservation(reservation.id)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        >
          <TooltipTrigger asChild>
            <div
              ref={blockRef}
              className={cn(
                'absolute rounded-md border shadow-sm cursor-grab active:cursor-grabbing',
                'flex items-center gap-1 px-2 overflow-hidden',
                'transition-shadow hover:shadow-md',
                'group',
                isCancelled && 'opacity-60',
                isBeingDragged && 'opacity-50 shadow-lg z-50'
              )}
              style={{
                left,
                top: top + 4,
                width: Math.max(width, 40),
                height: ROW_HEIGHT - 8,
                backgroundColor: statusColor,
                borderColor: isCancelled ? '#6B7280' : statusColor,
                backgroundImage: isCancelled
                  ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(107,114,128,0.3) 5px, rgba(107,114,128,0.3) 10px)'
                  : undefined,
              }}
              onMouseDown={handleMouseDown}
              onDoubleClick={handleDoubleClick}
              role="button"
              tabIndex={0}
              aria-label={`${reservation.customer.name}, ${reservation.partySize} guests, ${formatTimeRange(reservation.startTime, reservation.endTime)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSheetOpen(true);
                }
              }}
            >
              {/* Left resize handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4 text-white/70" />
              </div>

              {/* Content */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 text-white pl-2">
                <PriorityIcon priority={reservation.priority} />
                <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium" aria-hidden="true">
                  {reservation.partySize}
                </span>
                <span className="text-sm font-medium truncate">
                  {reservation.customer.name}
                </span>
                {width > 120 && (
                  <span className="text-xs opacity-80 shrink-0">
                    {formatTimeRange(reservation.startTime, reservation.endTime)}
                  </span>
                )}
              </div>

              {/* Priority badge */}
              {reservation.priority !== 'STANDARD' && width > 160 && (
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white text-xs shrink-0"
                >
                  {PRIORITY_LABELS[reservation.priority]}
                </Badge>
              )}

              {/* Right resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4 text-white/70" />
              </div>
            </div>
          </TooltipTrigger>
        </ReservationContextMenu>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{reservation.customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {reservation.customer.phone}
            </p>
            <p className="text-sm">
              {reservation.partySize} guests •{' '}
              {formatTimeRange(reservation.startTime, reservation.endTime)}
            </p>
            {reservation.notes && (
              <p className="text-sm text-muted-foreground">
                {reservation.notes}
              </p>
            )}
            <p className="text-xs text-muted-foreground capitalize">
              Status: {reservation.status.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      <ReservationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="edit"
        reservation={reservation}
        onSubmit={(data) => {
          const result = handleUpdateReservation(data);
          if (result.success) {
            setSheetOpen(false);
          }
          return result;
        }}
      />
    </TooltipProvider>
  );
});
