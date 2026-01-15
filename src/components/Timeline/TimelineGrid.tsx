import { memo, useMemo, useCallback, useRef, useState } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservations } from '@/hooks/useReservations';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ReservationBlock } from '@/components/ReservationBlock';
import { CurrentTimeLine } from './CurrentTimeLine';
import { ReservationSheet } from '@/components/ReservationBlock/ReservationSheet';
import {
  getTotalSlots,
  BASE_SLOT_WIDTH,
  ROW_HEIGHT,
  slotsToDuration,
} from '@/utils/timeCalculations';
import { getTablesWithSectors } from '@/utils/gridHelpers';
import type { UUID } from '@/types/models';
import { cn } from '@/lib/utils';

interface DragPreviewData {
  tableId: UUID;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export const TimelineGrid = memo(function TimelineGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const sectors = useReservationStore((state) => state.sectors);
  const tables = useReservationStore((state) => state.tables);
  const collapsedSectors = useReservationStore((state) => state.collapsedSectors);

  const { filteredReservations, createReservation } = useReservations();
  const {
    handleCreateDragStart,
    handleCreateDragMove,
    handleCreateDragEnd,
    cancelDrag,
    dragState,
    hasConflict,
  } = useDragAndDrop();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetData, setSheetData] = useState<DragPreviewData | null>(null);

  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
  const totalSlots = getTotalSlots();
  const gridWidth = totalSlots * slotWidth;

  const tablesWithSectors = useMemo(
    () => getTablesWithSectors(tables, sectors, collapsedSectors),
    [tables, sectors, collapsedSectors]
  );

  const gridHeight = tablesWithSectors.length * ROW_HEIGHT;

  // Group reservations by table for efficient rendering
  const reservationsByTable = useMemo(() => {
    const map = new Map<UUID, typeof filteredReservations>();
    for (const reservation of filteredReservations) {
      const list = map.get(reservation.tableId) || [];
      list.push(reservation);
      map.set(reservation.tableId, list);
    }
    return map;
  }, [filteredReservations]);

  // Get table by row index
  const getTableByRowIndex = useCallback(
    (rowIndex: number) => {
      return tablesWithSectors[rowIndex] ?? null;
    },
    [tablesWithSectors]
  );

  // Mouse event handlers for drag-to-create
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rowIndex = Math.floor(y / ROW_HEIGHT);
      const table = getTableByRowIndex(rowIndex);

      if (!table) return;

      handleCreateDragStart(table.id, e.clientX, rect);
    },
    [getTableByRowIndex, handleCreateDragStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      handleCreateDragMove(e.clientX, rect);
    },
    [dragState.isDragging, handleCreateDragMove]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || dragState.dragType !== 'create') return;

    const result = handleCreateDragEnd();
    if (result && result.durationMinutes >= 30) {
      setSheetData(result);
      setSheetOpen(true);
    }
  }, [dragState.isDragging, dragState.dragType, handleCreateDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (dragState.isDragging) {
      cancelDrag();
    }
  }, [dragState.isDragging, cancelDrag]);

  // Create reservation from sheet
  const handleCreateReservation = useCallback(
    (data: {
      customer: { name: string; phone: string; email?: string; notes?: string };
      partySize: number;
      durationMinutes: number;
      status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'FINISHED' | 'NO_SHOW' | 'CANCELLED';
      priority: 'STANDARD' | 'VIP' | 'LARGE_GROUP';
      notes?: string;
    }) => {
      if (!sheetData) return;

      const result = createReservation({
        tableId: sheetData.tableId,
        customer: data.customer,
        partySize: data.partySize,
        startTime: sheetData.startTime,
        durationMinutes: data.durationMinutes,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
      });

      if (result.success) {
        setSheetOpen(false);
        setSheetData(null);
      }

      return result;
    },
    [sheetData, createReservation]
  );

  // Generate 30-minute grid lines
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i <= totalSlots; i += 2) {
      lines.push(i * slotWidth);
    }
    return lines;
  }, [totalSlots, slotWidth]);

  // Generate horizontal row lines
  const rowLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i <= tablesWithSectors.length; i++) {
      lines.push(i * ROW_HEIGHT);
    }
    return lines;
  }, [tablesWithSectors.length]);

  // Drag preview
  const dragPreview = useMemo(() => {
    if (
      !dragState.isDragging ||
      dragState.dragType !== 'create' ||
      dragState.startSlot === null ||
      dragState.endSlot === null ||
      dragState.tableId === null
    ) {
      return null;
    }

    const table = tablesWithSectors.find((t) => t.id === dragState.tableId);
    if (!table) return null;

    const left = dragState.startSlot * slotWidth;
    const width = (dragState.endSlot - dragState.startSlot) * slotWidth;
    const top = table.rowIndex * ROW_HEIGHT;

    return { left, width, top };
  }, [dragState, tablesWithSectors, slotWidth]);

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Grid area */}
        <div
          ref={gridRef}
          className="relative flex-1 cursor-crosshair select-none"
          style={{ width: gridWidth, minHeight: gridHeight }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          role="grid"
          aria-label="Reservation timeline grid"
        >
          {/* Vertical grid lines (30 min) */}
          {gridLines.map((x, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-px bg-border pointer-events-none"
              style={{ left: x, height: gridHeight }}
              aria-hidden="true"
            />
          ))}

          {/* Horizontal row lines */}
          {rowLines.map((y, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px bg-border pointer-events-none"
              style={{ top: y, width: gridWidth }}
              aria-hidden="true"
            />
          ))}

          {/* Current time line */}
          <CurrentTimeLine />

          {/* Reservations */}
          {tablesWithSectors.map((table) => {
            const tableReservations = reservationsByTable.get(table.id) || [];
            return tableReservations.map((reservation) => (
              <ReservationBlock
                key={reservation.id}
                reservation={reservation}
                rowIndex={table.rowIndex}
                slotWidth={slotWidth}
              />
            ));
          })}

          {/* Drag preview */}
          {dragPreview && (
            <div
              className={cn(
                'absolute rounded-md border-2 border-dashed pointer-events-none transition-colors',
                hasConflict
                  ? 'bg-red-100 border-red-500'
                  : 'bg-blue-100 border-blue-500'
              )}
              style={{
                left: dragPreview.left,
                top: dragPreview.top + 4,
                width: dragPreview.width,
                height: ROW_HEIGHT - 8,
              }}
              aria-hidden="true"
            >
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-blue-700">
                {dragState.startSlot !== null && dragState.endSlot !== null
                  ? `${slotsToDuration(dragState.endSlot - dragState.startSlot)} min`
                  : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Create reservation sheet */}
      <ReservationSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSheetData(null);
        }}
        mode="create"
        initialData={
          sheetData
            ? {
                tableId: sheetData.tableId,
                startTime: sheetData.startTime.toISOString(),
                durationMinutes: sheetData.durationMinutes,
              }
            : undefined
        }
        onSubmit={handleCreateReservation}
      />
    </>
  );
});
