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
  timeToSlotIndex,
  durationToSlots,
} from '@/utils/timeCalculations';
import { getTablesWithSectors } from '@/utils/gridHelpers';
import type { UUID } from '@/types/models';
import { cn } from '@/lib/utils';

const SECTOR_HEADER_HEIGHT = 32; // h-8 = 32px

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
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const filters = useReservationStore((state) => state.filters);

  const { filteredReservations, createReservation, updateReservation, getReservation } = useReservations();
  const {
    handleCreateDragStart,
    handleCreateDragMove,
    handleCreateDragEnd,
    handleMoveDragMove,
    handleMoveDragEnd,
    handleResizeDragMove,
    handleResizeDragEnd,
    cancelDrag,
    dragState,
    hasConflict,
  } = useDragAndDrop();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetData, setSheetData] = useState<DragPreviewData | null>(null);

  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
  const totalSlots = getTotalSlots();
  const gridWidth = totalSlots * slotWidth;

  const sortedSectors = useMemo(() => {
    const filtered = filters.sectorIds.length > 0
      ? sectors.filter((s) => filters.sectorIds.includes(s.id))
      : sectors;
    return [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sectors, filters.sectorIds]);

  const tablesWithSectors = useMemo(
    () => getTablesWithSectors(tables, sortedSectors, collapsedSectors),
    [tables, sortedSectors, collapsedSectors]
  );

  // Calculate Y offset for each table and sector header positions
  const { tableYOffsets, sectorHeaderPositions } = useMemo(() => {
    const offsets = new Map<UUID, number>();
    const sectorPositions: { id: UUID; y: number }[] = [];
    let currentY = 0;

    for (const sector of sortedSectors) {
      sectorPositions.push({ id: sector.id, y: currentY });
      currentY += SECTOR_HEADER_HEIGHT; // Add sector header height
      const sectorTables = tablesWithSectors.filter(t => t.sector.id === sector.id);
      for (const table of sectorTables) {
        offsets.set(table.id, currentY);
        currentY += ROW_HEIGHT;
      }
    }

    return { tableYOffsets: offsets, sectorHeaderPositions: sectorPositions };
  }, [sortedSectors, tablesWithSectors]);

  // Grid height includes sector headers + table rows
  const gridHeight = sortedSectors.length * SECTOR_HEADER_HEIGHT + tablesWithSectors.length * ROW_HEIGHT;

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

  // Get table by Y position (accounting for sector headers)
  const getTableByYPosition = useCallback(
    (y: number) => {
      for (const table of tablesWithSectors) {
        const yOffset = tableYOffsets.get(table.id);
        if (yOffset !== undefined && y >= yOffset && y < yOffset + ROW_HEIGHT) {
          return table;
        }
      }
      return null;
    },
    [tablesWithSectors, tableYOffsets]
  );

  // Get table ID by Y position (for drag operations)
  const getTableIdByY = useCallback(
    (y: number): UUID | null => {
      const table = getTableByYPosition(y);
      return table?.id ?? null;
    },
    [getTableByYPosition]
  );

  // Mouse event handlers for drag-to-create
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const table = getTableByYPosition(y);

      if (!table) return;

      handleCreateDragStart(table.id, e.clientX, rect);
    },
    [getTableByYPosition, handleCreateDragStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();

      switch (dragState.dragType) {
        case 'create':
          handleCreateDragMove(e.clientX, rect);
          break;
        case 'move':
          handleMoveDragMove(e.clientX, e.clientY, rect, getTableIdByY);
          break;
        case 'resize-start':
        case 'resize-end':
          handleResizeDragMove(e.clientX, rect);
          break;
      }
    },
    [dragState.isDragging, dragState.dragType, handleCreateDragMove, handleMoveDragMove, handleResizeDragMove, getTableIdByY]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;

    // Don't apply changes if there's a conflict
    if (hasConflict) {
      cancelDrag();
      return;
    }

    switch (dragState.dragType) {
      case 'create': {
        const result = handleCreateDragEnd();
        if (result && result.durationMinutes >= 30) {
          setSheetData(result);
          setSheetOpen(true);
        }
        break;
      }
      case 'move': {
        const result = handleMoveDragEnd();
        if (result) {
          updateReservation(result.reservationId, {
            tableId: result.newTableId,
            startTime: result.newStartTime,
          });
        }
        break;
      }
      case 'resize-start':
      case 'resize-end': {
        const result = handleResizeDragEnd();
        if (result) {
          updateReservation(result.reservationId, {
            startTime: result.newStartTime,
            durationMinutes: result.newDurationMinutes,
          });
        }
        break;
      }
    }
  }, [dragState.isDragging, dragState.dragType, handleCreateDragEnd, handleMoveDragEnd, handleResizeDragEnd, updateReservation, hasConflict, cancelDrag]);

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
      tableId?: string;
      startTime?: string;
    }) => {
      if (!sheetData) return;

      // Use the startTime from form data if provided (user edited it), otherwise use the original
      const startTime = data.startTime ? new Date(data.startTime) : sheetData.startTime;

      const result = createReservation({
        tableId: sheetData.tableId,
        customer: data.customer,
        partySize: data.partySize,
        startTime,
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

  // Generate 15-minute grid lines (every slot)
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i <= totalSlots; i++) {
      lines.push(i * slotWidth);
    }
    return lines;
  }, [totalSlots, slotWidth]);

  // Generate horizontal row lines (at table boundaries, accounting for sector headers)
  const rowLines = useMemo(() => {
    const lines: number[] = [];
    for (const table of tablesWithSectors) {
      const yOffset = tableYOffsets.get(table.id) ?? 0;
      lines.push(yOffset);
      lines.push(yOffset + ROW_HEIGHT);
    }
    // Remove duplicates and sort
    return [...new Set(lines)].sort((a, b) => a - b);
  }, [tablesWithSectors, tableYOffsets]);

  // Drag preview for create, move, and resize operations
  const dragPreview = useMemo(() => {
    if (!dragState.isDragging || dragState.startSlot === null || dragState.endSlot === null) {
      return null;
    }

    // Create preview
    if (dragState.dragType === 'create' && dragState.tableId !== null) {
      const yOffset = tableYOffsets.get(dragState.tableId);
      if (yOffset === undefined) return null;

      const left = dragState.startSlot * slotWidth;
      const width = (dragState.endSlot - dragState.startSlot) * slotWidth;
      return { left, width, top: yOffset, type: 'create' as const };
    }

    // Move preview
    if (dragState.dragType === 'move' && dragState.reservationId !== null && dragState.tableId !== null) {
      const reservation = getReservation(dragState.reservationId);
      if (!reservation) return null;

      const yOffset = tableYOffsets.get(dragState.tableId);
      if (yOffset === undefined) return null;

      const slotDiff = dragState.endSlot - dragState.startSlot;
      const originalSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
      const newStartSlot = originalSlot + slotDiff;
      const durationSlots = durationToSlots(reservation.durationMinutes);

      const left = newStartSlot * slotWidth;
      const width = durationSlots * slotWidth;
      return { left, width, top: yOffset, type: 'move' as const, name: reservation.customer.name };
    }

    // Resize preview
    if ((dragState.dragType === 'resize-start' || dragState.dragType === 'resize-end') && dragState.reservationId !== null) {
      const reservation = getReservation(dragState.reservationId);
      if (!reservation) return null;

      const yOffset = tableYOffsets.get(reservation.tableId);
      if (yOffset === undefined) return null;

      const slotDiff = dragState.endSlot - dragState.startSlot;
      const originalStartSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
      const originalDurationSlots = durationToSlots(reservation.durationMinutes);

      let newStartSlot: number;
      let newDurationSlots: number;

      if (dragState.dragType === 'resize-end') {
        newStartSlot = originalStartSlot;
        newDurationSlots = Math.max(2, Math.min(24, originalDurationSlots + slotDiff));
      } else {
        newDurationSlots = Math.max(2, Math.min(24, originalDurationSlots - slotDiff));
        newStartSlot = originalStartSlot + (originalDurationSlots - newDurationSlots);
      }

      const left = newStartSlot * slotWidth;
      const width = newDurationSlots * slotWidth;
      return { left, width, top: yOffset, type: 'resize' as const, name: reservation.customer.name };
    }

    return null;
  }, [dragState, tableYOffsets, slotWidth, getReservation, selectedDate]);

  return (
    <>
      {/* Grid area */}
      <div
        ref={gridRef}
        className="relative cursor-crosshair select-none"
        style={{ width: gridWidth, height: gridHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="grid"
        aria-label="Reservation timeline grid"
      >
          {/* Sector header backgrounds */}
          {sectorHeaderPositions.map(({ id, y }) => (
            <div
              key={`sector-bg-${id}`}
              className="absolute left-0 bg-muted/50 pointer-events-none"
              style={{
                top: y,
                width: gridWidth,
                height: SECTOR_HEADER_HEIGHT,
              }}
              aria-hidden="true"
            />
          ))}

          {/* Vertical grid lines (15 min) */}
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
            const yOffset = tableYOffsets.get(table.id) ?? 0;
            return tableReservations.map((reservation) => (
              <ReservationBlock
                key={reservation.id}
                reservation={reservation}
                top={yOffset}
                slotWidth={slotWidth}
              />
            ));
          })}

        {/* Drag preview */}
        {dragPreview && (
          <div
            className={cn(
              'absolute rounded-md pointer-events-none z-40 border-2',
              dragPreview.type === 'create' && 'border-dashed',
              hasConflict
                ? 'bg-red-200 border-red-500 shadow-lg shadow-red-500/30'
                : dragPreview.type === 'create'
                  ? 'bg-blue-100 border-blue-500'
                  : 'bg-[rgb(255,147,67)]/80 border-[rgb(255,147,67)] shadow-lg'
            )}
            style={{
              left: dragPreview.left,
              top: dragPreview.top + 4,
              width: Math.max(dragPreview.width, 40),
              height: ROW_HEIGHT - 8,
            }}
            aria-hidden="true"
          >
            {dragPreview.type === 'create' ? (
              <span className={cn(
                'absolute inset-0 flex items-center justify-center text-sm font-medium',
                hasConflict ? 'text-red-700' : 'text-blue-700'
              )}>
                {dragState.startSlot !== null && dragState.endSlot !== null
                  ? `${slotsToDuration(dragState.endSlot - dragState.startSlot)} min`
                  : ''}
              </span>
            ) : (
              <span className={cn(
                'absolute inset-0 flex items-center justify-center text-sm font-medium truncate px-2',
                hasConflict ? 'text-red-700' : 'text-white'
              )}>
                {'name' in dragPreview ? dragPreview.name : ''}
              </span>
            )}
          </div>
        )}
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
