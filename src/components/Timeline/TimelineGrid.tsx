import { memo, useMemo, useCallback, useRef, useState } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservationActions } from '@/hooks/useReservationActions';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ReservationBlock } from '@/components/ReservationBlock';
import { CurrentTimeLine } from './CurrentTimeLine';
import { LazyReservationSheet } from '@/components/ReservationBlock/LazyReservationSheet';
import {
  getTotalSlots,
  BASE_SLOT_WIDTH,
  BASE_ROW_HEIGHT,
  slotsToDuration,
  timeToSlotIndex,
  durationToSlots,
} from '@/utils/timeCalculations';
import { isSameDay, parseISO } from 'date-fns';
import { getTablesWithSectors } from '@/utils/gridHelpers';
import type { UUID } from '@/types/models';
import type { ViewportState } from './Timeline';
import { cn } from '@/lib/utils';

const BASE_sectorHeaderHeight = 32;
const OVERSCAN_COLUMNS = 40; // Large overscan to prevent blinking during scroll
const OVERSCAN_ROWS = 5; // Extra rows to render outside viewport

interface DragPreviewData {
  tableId: UUID;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

interface TimelineGridProps {
  viewport: ViewportState;
}

export const TimelineGrid = memo(function TimelineGrid({ viewport }: TimelineGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const sectors = useReservationStore((state) => state.sectors);
  const tables = useReservationStore((state) => state.tables);
  const collapsedSectors = useReservationStore((state) => state.collapsedSectors);
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const filters = useReservationStore((state) => state.filters);

  // Use lightweight actions hook to avoid unnecessary re-renders
  const { createReservation, updateReservation, getReservation } = useReservationActions();

  // Subscribe to raw reservations and compute filtered list
  const reservations = useReservationStore((state) => state.reservations);
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
  const rowHeight = (BASE_ROW_HEIGHT * zoomLevel) / 100;
  const sectorHeaderHeight = (BASE_sectorHeaderHeight * zoomLevel) / 100;
  const totalSlots = getTotalSlots();
  const gridWidth = totalSlots * slotWidth;

  const sortedSectors = useMemo(() => {
    const filtered = filters.sectorIds.length > 0
      ? sectors.filter((s) => filters.sectorIds.includes(s.id))
      : sectors;
    return [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sectors, filters.sectorIds]);

  // Compute filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      // Date filter
      if (!isSameDay(parseISO(reservation.startTime), selectedDate)) {
        return false;
      }

      // Sector filter
      if (filters.sectorIds.length > 0) {
        const table = tables.find((t) => t.id === reservation.tableId);
        if (!table || !filters.sectorIds.includes(table.sectorId)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && reservation.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = reservation.customer.name.toLowerCase().includes(query);
        const matchesPhone = reservation.customer.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, filters, selectedDate, tables]);

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
      currentY += sectorHeaderHeight;
      const sectorTables = tablesWithSectors.filter(t => t.sector.id === sector.id);
      for (const table of sectorTables) {
        offsets.set(table.id, currentY);
        currentY += rowHeight;
      }
    }

    return { tableYOffsets: offsets, sectorHeaderPositions: sectorPositions };
  }, [sortedSectors, tablesWithSectors, sectorHeaderHeight, rowHeight]);

  const gridHeight = sortedSectors.length * sectorHeaderHeight + tablesWithSectors.length * rowHeight;

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

  // Calculate visible ranges for virtualization
  const visibleRange = useMemo(() => {
    // If viewport not measured yet, show reasonable defaults
    if (viewport.viewportWidth === 0 || viewport.viewportHeight === 0) {
      return { startCol: 0, endCol: Math.min(totalSlots, 60), startY: 0, endY: 2000 };
    }

    const startCol = Math.max(0, Math.floor(viewport.scrollLeft / slotWidth) - OVERSCAN_COLUMNS);
    const endCol = Math.min(totalSlots, Math.ceil((viewport.scrollLeft + viewport.viewportWidth) / slotWidth) + OVERSCAN_COLUMNS);
    const startY = Math.max(0, viewport.scrollTop - OVERSCAN_ROWS * rowHeight);
    const endY = viewport.scrollTop + viewport.viewportHeight + OVERSCAN_ROWS * rowHeight;

    return { startCol, endCol, startY, endY };
  }, [viewport, slotWidth, rowHeight, totalSlots]);

  // Only render visible vertical grid lines (every 4th for hour markers visible, every 1 for 15-min)
  const visibleGridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = visibleRange.startCol; i <= visibleRange.endCol; i++) {
      lines.push(i * slotWidth);
    }
    return lines;
  }, [visibleRange.startCol, visibleRange.endCol, slotWidth]);

  // Only render visible sector headers
  const visibleSectorHeaders = useMemo(() => {
    return sectorHeaderPositions.filter(
      ({ y }) => y + sectorHeaderHeight > visibleRange.startY && y < visibleRange.endY
    );
  }, [sectorHeaderPositions, visibleRange.startY, visibleRange.endY]);

  // Only render visible tables and their row lines
  const visibleTables = useMemo(() => {
    return tablesWithSectors.filter((table) => {
      const yOffset = tableYOffsets.get(table.id);
      if (yOffset === undefined) return false;
      return yOffset + rowHeight > visibleRange.startY && yOffset < visibleRange.endY;
    });
  }, [tablesWithSectors, tableYOffsets, rowHeight, visibleRange.startY, visibleRange.endY]);

  // Only render visible row lines
  const visibleRowLines = useMemo(() => {
    const lines: number[] = [];
    for (const table of visibleTables) {
      const yOffset = tableYOffsets.get(table.id) ?? 0;
      if (!lines.includes(yOffset)) lines.push(yOffset);
      if (!lines.includes(yOffset + rowHeight)) lines.push(yOffset + rowHeight);
    }
    return lines.sort((a, b) => a - b);
  }, [visibleTables, tableYOffsets, rowHeight]);

  // Only render visible reservations
  const visibleReservations = useMemo(() => {
    const result: Array<{ reservation: typeof filteredReservations[0]; yOffset: number }> = [];

    for (const table of visibleTables) {
      const tableReservations = reservationsByTable.get(table.id) || [];
      const yOffset = tableYOffsets.get(table.id) ?? 0;

      for (const reservation of tableReservations) {
        // Calculate reservation's X position
        const startSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
        const endSlot = startSlot + durationToSlots(reservation.durationMinutes);
        const resLeft = startSlot * slotWidth;
        const resRight = endSlot * slotWidth;

        // Check if reservation is in visible horizontal range
        if (resRight > visibleRange.startCol * slotWidth && resLeft < visibleRange.endCol * slotWidth) {
          result.push({ reservation, yOffset });
        }
      }
    }

    return result;
  }, [visibleTables, reservationsByTable, tableYOffsets, selectedDate, slotWidth, visibleRange]);

  // Get table by Y position
  const getTableByYPosition = useCallback(
    (y: number) => {
      for (const table of tablesWithSectors) {
        const yOffset = tableYOffsets.get(table.id);
        if (yOffset !== undefined && y >= yOffset && y < yOffset + rowHeight) {
          return table;
        }
      }
      return null;
    },
    [tablesWithSectors, tableYOffsets, rowHeight]
  );

  const getTableIdByY = useCallback(
    (y: number): UUID | null => {
      const table = getTableByYPosition(y);
      return table?.id ?? null;
    },
    [getTableByYPosition]
  );

  // Mouse event handlers
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

  // Drag preview
  const dragPreview = useMemo(() => {
    if (!dragState.isDragging || dragState.startSlot === null || dragState.endSlot === null) {
      return null;
    }

    if (dragState.dragType === 'create' && dragState.tableId !== null) {
      const yOffset = tableYOffsets.get(dragState.tableId);
      if (yOffset === undefined) return null;
      const left = dragState.startSlot * slotWidth;
      const width = (dragState.endSlot - dragState.startSlot) * slotWidth;
      return { left, width, top: yOffset, type: 'create' as const };
    }

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
      <div
        ref={gridRef}
        className="relative cursor-crosshair select-none"
        style={{
          width: gridWidth,
          height: gridHeight,
          contain: 'strict', // CSS containment for better performance
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="region"
        aria-label="Reservation timeline"
      >
        {/* Sector header backgrounds - only visible */}
        {visibleSectorHeaders.map(({ id, y }) => (
          <div
            key={`sector-bg-${id}`}
            className="absolute left-0 bg-muted/50 pointer-events-none"
            style={{
              top: y,
              width: gridWidth,
              height: sectorHeaderHeight,
              transform: 'translateZ(0)', // GPU acceleration
            }}
            aria-hidden="true"
          />
        ))}

        {/* Vertical grid lines - only visible */}
        {visibleGridLines.map((x) => (
          <div
            key={`v-${x}`}
            className="absolute top-0 w-px bg-border pointer-events-none"
            style={{
              left: x,
              height: gridHeight,
              transform: 'translateZ(0)',
            }}
            aria-hidden="true"
          />
        ))}

        {/* Horizontal row lines - only visible */}
        {visibleRowLines.map((y) => (
          <div
            key={`h-${y}`}
            className="absolute left-0 h-px bg-border pointer-events-none"
            style={{
              top: y,
              width: gridWidth,
              transform: 'translateZ(0)',
            }}
            aria-hidden="true"
          />
        ))}

        {/* Current time line */}
        <CurrentTimeLine />

        {/* Reservations - only visible */}
        {visibleReservations.map(({ reservation, yOffset }) => (
          <ReservationBlock
            key={reservation.id}
            reservation={reservation}
            top={yOffset}
            slotWidth={slotWidth}
            rowHeight={rowHeight}
          />
        ))}

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
              height: rowHeight - 8,
              transform: 'translateZ(0)',
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

      <LazyReservationSheet
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
