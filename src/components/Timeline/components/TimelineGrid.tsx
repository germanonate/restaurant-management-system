import { memo, useMemo, useCallback, useRef, useState } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservationActions } from '@/hooks/useReservationActions';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useGridLayout } from '../hooks/useGridLayout';
import { useGridVirtualization } from '../hooks/useGridVirtualization';
import { ReservationBlock } from '@/components/ReservationBlock';
import { CurrentTimeLine } from './CurrentTimeLine';
import { DragPreview } from './DragPreview';
import { VerticalGridLines, HorizontalGridLines, SectorBackgrounds } from './GridLines';
import { LazyReservationSheet } from '@/components/ReservationBlock/components/ReservationSheet/LazyReservationSheet';
import { getTotalSlots, BASE_SLOT_WIDTH, BASE_ROW_HEIGHT, timeToSlotIndex, durationToSlots } from '../utils/timeCalculations';
import { isSameDay, parseISO } from 'date-fns';
import type { UUID, Reservation } from '@/types/models';
import { BASE_SECTOR_HEADER_HEIGHT } from '../constants/layoutConstants';
import type { ViewportState, DragPreviewData, CreateReservationData } from '../constants/types';

// ============================================================================
// Types
// ============================================================================

interface TimelineGridProps {
  viewport: ViewportState;
}

// ============================================================================
// Component
// ============================================================================

export const TimelineGrid = memo(function TimelineGrid({ viewport }: TimelineGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Store subscriptions
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const sectors = useReservationStore((state) => state.sectors);
  const tables = useReservationStore((state) => state.tables);
  const collapsedSectors = useReservationStore((state) => state.collapsedSectors);
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const filters = useReservationStore((state) => state.filters);
  const reservations = useReservationStore((state) => state.reservations);

  // Actions
  const { createReservation, updateReservation, getReservation } = useReservationActions();
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

  // Local state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetData, setSheetData] = useState<DragPreviewData | null>(null);

  // Calculated dimensions
  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
  const rowHeight = (BASE_ROW_HEIGHT * zoomLevel) / 100;
  const sectorHeaderHeight = (BASE_SECTOR_HEADER_HEIGHT * zoomLevel) / 100;
  const totalSlots = getTotalSlots();
  const gridWidth = totalSlots * slotWidth;

  // Grid layout
  const { tablesWithSectors, tableYOffsets, sectorHeaderPositions, gridHeight } = useGridLayout({
    sectors,
    tables,
    collapsedSectors,
    filterSectorIds: filters.sectorIds,
    rowHeight,
    sectorHeaderHeight,
  });

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (!isSameDay(parseISO(reservation.startTime), selectedDate)) return false;
      if (filters.sectorIds.length > 0) {
        const table = tables.find((t) => t.id === reservation.tableId);
        if (!table || !filters.sectorIds.includes(table.sectorId)) return false;
      }
      if (filters.status && reservation.status !== filters.status) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = reservation.customer.name.toLowerCase().includes(query);
        const matchesPhone = reservation.customer.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [reservations, filters, selectedDate, tables]);

  // Group reservations by table
  const reservationsByTable = useMemo(() => {
    const map = new Map<UUID, Reservation[]>();
    for (const reservation of filteredReservations) {
      const list = map.get(reservation.tableId) || [];
      list.push(reservation);
      map.set(reservation.tableId, list);
    }
    return map;
  }, [filteredReservations]);

  // Virtualization
  const { visibleGridLines, visibleSectorHeaders, visibleRowLines, visibleReservations } =
    useGridVirtualization({
      viewport,
      slotWidth,
      rowHeight,
      totalSlots,
      sectorHeaderHeight,
      tablesWithSectors,
      tableYOffsets,
      sectorHeaderPositions,
      reservationsByTable,
      selectedDate,
    });

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
    (y: number): UUID | null => getTableByYPosition(y)?.id ?? null,
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
    if (dragState.isDragging) cancelDrag();
  }, [dragState.isDragging, cancelDrag]);

  const handleCreateReservation = useCallback(
    (data: CreateReservationData) => {
      if (!sheetData) return { success: false, error: 'No sheet data' };
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

  // Drag preview calculation
  const dragPreview = useMemo(() => {
    if (!dragState.isDragging || dragState.startSlot === null || dragState.endSlot === null) {
      return null;
    }

    if (dragState.dragType === 'create' && dragState.tableId !== null) {
      const yOffset = tableYOffsets.get(dragState.tableId);
      if (yOffset === undefined) return null;
      return {
        left: dragState.startSlot * slotWidth,
        width: (dragState.endSlot - dragState.startSlot) * slotWidth,
        top: yOffset,
        type: 'create' as const,
      };
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
      return {
        left: newStartSlot * slotWidth,
        width: durationSlots * slotWidth,
        top: yOffset,
        type: 'move' as const,
        name: reservation.customer.name,
      };
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

      return {
        left: newStartSlot * slotWidth,
        width: newDurationSlots * slotWidth,
        top: yOffset,
        type: 'resize' as const,
        name: reservation.customer.name,
      };
    }

    return null;
  }, [dragState, tableYOffsets, slotWidth, getReservation, selectedDate]);

  return (
    <>
      <div
        ref={gridRef}
        className="relative cursor-crosshair select-none"
        style={{ width: gridWidth, height: gridHeight, contain: 'strict' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="region"
        aria-label="Reservation timeline"
      >
        <SectorBackgrounds headers={visibleSectorHeaders} width={gridWidth} height={sectorHeaderHeight} />
        <VerticalGridLines lines={visibleGridLines} height={gridHeight} />
        <HorizontalGridLines lines={visibleRowLines} width={gridWidth} />
        <CurrentTimeLine />

        {visibleReservations.map(({ reservation, yOffset }) => (
          <ReservationBlock
            key={reservation.id}
            reservation={reservation}
            top={yOffset}
            slotWidth={slotWidth}
            rowHeight={rowHeight}
          />
        ))}

        {dragPreview && (
          <DragPreview
            left={dragPreview.left}
            top={dragPreview.top}
            width={dragPreview.width}
            height={rowHeight}
            type={dragPreview.type}
            name={'name' in dragPreview ? dragPreview.name : undefined}
            startSlot={dragState.startSlot}
            endSlot={dragState.endSlot}
            hasConflict={hasConflict}
          />
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
            ? { tableId: sheetData.tableId, startTime: sheetData.startTime.toISOString(), durationMinutes: sheetData.durationMinutes }
            : undefined
        }
        onSubmit={handleCreateReservation}
      />
    </>
  );
});
