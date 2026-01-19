import { memo, useCallback, useState, useRef } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservationActions } from '@/hooks/useReservationActions';
import { useDragAndDrop } from '@/components/Timeline/hooks/useDragAndDrop';
import { ReservationContextMenu } from './components/ReservationContextMenu';
import { LazyReservationSheet } from './components/LazyReservationSheet';
import { ResizeHandle } from './components/ResizeHandle';
import { ReservationContent } from './components/ReservationContent';
import { ReservationTooltip } from './components/ReservationTooltip';
import { getReservationPosition, getReservationWidth, formatTimeRange } from '@/components/Timeline/utils/timeCalculations';
import type { Priority, Reservation, ReservationStatus } from '@/types/models';
import { RESERVATION_STATUS_COLORS } from '@/types/models';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ReservationBlockProps {
  reservation: Reservation;
  top: number;
  slotWidth: number;
  rowHeight: number;
}

// ============================================================================
// Helpers
// ============================================================================

function arePropsEqual(
  prevProps: ReservationBlockProps,
  nextProps: ReservationBlockProps
): boolean {
  const prev = prevProps.reservation;
  const next = nextProps.reservation;

  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.startTime === next.startTime &&
    prev.endTime === next.endTime &&
    prev.durationMinutes === next.durationMinutes &&
    prev.customer.name === next.customer.name &&
    prev.partySize === next.partySize &&
    prev.priority === next.priority &&
    prev.tableId === next.tableId &&
    prevProps.top === nextProps.top &&
    prevProps.slotWidth === nextProps.slotWidth &&
    prevProps.rowHeight === nextProps.rowHeight
  );
}

function getBlockStyles(params: {
  left: number;
  top: number;
  width: number;
  height: number;
  statusColor: string;
  isCancelled: boolean;
  isBeingDragged: boolean;
  showConflict: boolean;
}): React.CSSProperties {
  const { left, top, width, height, statusColor, isCancelled, isBeingDragged, showConflict } = params;

  return {
    left,
    top: top + 4,
    width: Math.max(width, 40),
    height: height - 8,
    backgroundColor: showConflict ? '#FEE2E2' : statusColor,
    borderColor: showConflict ? undefined : isCancelled ? '#9CA3AF' : statusColor,
    backgroundImage:
      isCancelled && !showConflict
        ? 'repeating-linear-gradient(45deg, #D1D5DB, #D1D5DB 4px, #9CA3AF 4px, #9CA3AF 8px)'
        : undefined,
    transform: 'translateZ(0)',
    willChange: isBeingDragged ? 'transform' : 'auto',
  };
}

// ============================================================================
// Component
// ============================================================================

export const ReservationBlock = memo(function ReservationBlock({
  reservation,
  top,
  slotWidth,
  rowHeight,
}: ReservationBlockProps) {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const blockRef = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    updateReservation,
    deleteReservation,
    duplicateReservation,
    confirmReservation,
    seatReservation,
    finishReservation,
    markNoShow,
    cancelReservation,
  } = useReservationActions();

  const { handleMoveDragStart, handleResizeDragStart, dragState, hasConflict } = useDragAndDrop();

  // Calculate position and dimensions
  const left = getReservationPosition(reservation.startTime, selectedDate, slotWidth);
  const width = getReservationWidth(reservation.durationMinutes, slotWidth);
  const statusColor = RESERVATION_STATUS_COLORS[reservation.status];
  const isCancelled = reservation.status === 'CANCELLED';

  // Drag state
  const isBeingDragged = dragState.isDragging && dragState.reservationId === reservation.id;
  const showConflict = isBeingDragged && hasConflict;

  // Event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const rect = blockRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;

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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetOpen(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSheetOpen(true);
    }
  }, []);

  const handleEdit = useCallback(() => setSheetOpen(true), []);
  const handleDelete = useCallback(() => deleteReservation(reservation.id), [reservation.id, deleteReservation]);
  const handleDuplicate = useCallback(() => duplicateReservation(reservation.id), [reservation.id, duplicateReservation]);

  const handleSubmit = useCallback(
    (data: {
      customer: { name: string; phone: string; email?: string; notes?: string };
      partySize: number;
      durationMinutes: number;
      status: ReservationStatus;
      priority: Priority;
      notes?: string;
      tableId?: string;
      startTime?: string;
    }) => {
      const result = updateReservation(reservation.id, {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
      });
      if (result.success) {
        setSheetOpen(false);
      }
      return result;
    },
    [reservation.id, updateReservation]
  );

  const blockStyles = getBlockStyles({
    left,
    top,
    width,
    height: rowHeight,
    statusColor,
    isCancelled,
    isBeingDragged,
    showConflict,
  });

  return (
    <>
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
                  isBeingDragged && 'opacity-80 shadow-lg z-50',
                  showConflict && 'border-2 border-red-500 shadow-red-500/50 shadow-lg'
                )}
                style={blockStyles}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`${reservation.customer.name}, ${reservation.partySize} guests, ${formatTimeRange(reservation.startTime, reservation.endTime)}`}
              >
                <ResizeHandle position="left" isCancelled={isCancelled} />
                <ReservationContent
                  customerName={reservation.customer.name}
                  partySize={reservation.partySize}
                  startTime={reservation.startTime}
                  endTime={reservation.endTime}
                  priority={reservation.priority}
                  width={width}
                  isCancelled={isCancelled}
                />
                <ResizeHandle position="right" isCancelled={isCancelled} />
              </div>
            </TooltipTrigger>
          </ReservationContextMenu>
          <ReservationTooltip reservation={reservation} />
        </Tooltip>
      </TooltipProvider>

      <LazyReservationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="edit"
        reservation={reservation}
        onSubmit={handleSubmit}
      />
    </>
  );
}, arePropsEqual);
