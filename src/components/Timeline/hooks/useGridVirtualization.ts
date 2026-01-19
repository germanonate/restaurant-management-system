import { useMemo } from 'react';
import type { Reservation, UUID } from '@/types/models';
import { timeToSlotIndex, durationToSlots } from '../utils/timeCalculations';
import type { ViewportState } from '../Timeline';

const OVERSCAN_COLUMNS = 40;
const OVERSCAN_ROWS = 5;

interface VirtualizationParams {
  viewport: ViewportState;
  slotWidth: number;
  rowHeight: number;
  totalSlots: number;
  sectorHeaderHeight: number;
  tablesWithSectors: Array<{ id: UUID; sector: { id: UUID } }>;
  tableYOffsets: Map<UUID, number>;
  sectorHeaderPositions: Array<{ id: UUID; y: number }>;
  reservationsByTable: Map<UUID, Reservation[]>;
  selectedDate: Date;
}

interface VisibleRange {
  startCol: number;
  endCol: number;
  startY: number;
  endY: number;
}

interface VirtualizationResult {
  visibleRange: VisibleRange;
  visibleGridLines: number[];
  visibleSectorHeaders: Array<{ id: UUID; y: number }>;
  visibleTables: Array<{ id: UUID; sector: { id: UUID } }>;
  visibleRowLines: number[];
  visibleReservations: Array<{ reservation: Reservation; yOffset: number }>;
}

export function useGridVirtualization({
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
}: VirtualizationParams): VirtualizationResult {
  const visibleRange = useMemo((): VisibleRange => {
    if (viewport.viewportWidth === 0 || viewport.viewportHeight === 0) {
      return { startCol: 0, endCol: Math.min(totalSlots, 60), startY: 0, endY: 2000 };
    }

    const startCol = Math.max(0, Math.floor(viewport.scrollLeft / slotWidth) - OVERSCAN_COLUMNS);
    const endCol = Math.min(
      totalSlots,
      Math.ceil((viewport.scrollLeft + viewport.viewportWidth) / slotWidth) + OVERSCAN_COLUMNS
    );
    const startY = Math.max(0, viewport.scrollTop - OVERSCAN_ROWS * rowHeight);
    const endY = viewport.scrollTop + viewport.viewportHeight + OVERSCAN_ROWS * rowHeight;

    return { startCol, endCol, startY, endY };
  }, [viewport, slotWidth, rowHeight, totalSlots]);

  const visibleGridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = visibleRange.startCol; i <= visibleRange.endCol; i++) {
      lines.push(i * slotWidth);
    }
    return lines;
  }, [visibleRange.startCol, visibleRange.endCol, slotWidth]);

  const visibleSectorHeaders = useMemo(() => {
    return sectorHeaderPositions.filter(
      ({ y }) => y + sectorHeaderHeight > visibleRange.startY && y < visibleRange.endY
    );
  }, [sectorHeaderPositions, sectorHeaderHeight, visibleRange.startY, visibleRange.endY]);

  const visibleTables = useMemo(() => {
    return tablesWithSectors.filter((table) => {
      const yOffset = tableYOffsets.get(table.id);
      if (yOffset === undefined) return false;
      return yOffset + rowHeight > visibleRange.startY && yOffset < visibleRange.endY;
    });
  }, [tablesWithSectors, tableYOffsets, rowHeight, visibleRange.startY, visibleRange.endY]);

  const visibleRowLines = useMemo(() => {
    const lines: number[] = [];
    for (const table of visibleTables) {
      const yOffset = tableYOffsets.get(table.id) ?? 0;
      if (!lines.includes(yOffset)) lines.push(yOffset);
      if (!lines.includes(yOffset + rowHeight)) lines.push(yOffset + rowHeight);
    }
    return lines.sort((a, b) => a - b);
  }, [visibleTables, tableYOffsets, rowHeight]);

  const visibleReservations = useMemo(() => {
    const result: Array<{ reservation: Reservation; yOffset: number }> = [];

    for (const table of visibleTables) {
      const tableReservations = reservationsByTable.get(table.id) || [];
      const yOffset = tableYOffsets.get(table.id) ?? 0;

      for (const reservation of tableReservations) {
        const startSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
        const endSlot = startSlot + durationToSlots(reservation.durationMinutes);
        const resLeft = startSlot * slotWidth;
        const resRight = endSlot * slotWidth;

        if (resRight > visibleRange.startCol * slotWidth && resLeft < visibleRange.endCol * slotWidth) {
          result.push({ reservation, yOffset });
        }
      }
    }

    return result;
  }, [visibleTables, reservationsByTable, tableYOffsets, selectedDate, slotWidth, visibleRange]);

  return {
    visibleRange,
    visibleGridLines,
    visibleSectorHeaders,
    visibleTables,
    visibleRowLines,
    visibleReservations,
  };
}
