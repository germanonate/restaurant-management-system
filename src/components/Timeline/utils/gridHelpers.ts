import type { Table, Sector, Reservation, UUID, ConflictCheck } from '@/types/models';
import { parseISO, areIntervalsOverlapping } from 'date-fns';

export interface TableWithSector extends Table {
  sector: Sector;
  rowIndex: number;
}

export function getTablesWithSectors(
  tables: Table[],
  sectors: Sector[],
  collapsedSectors: Set<UUID>
): TableWithSector[] {
  const sectorMap = new Map(sectors.map(s => [s.id, s]));
  const result: TableWithSector[] = [];
  let rowIndex = 0;

  const sortedSectors = [...sectors].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const sector of sortedSectors) {
    const sectorTables = tables
      .filter(t => t.sectorId === sector.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (!collapsedSectors.has(sector.id)) {
      for (const table of sectorTables) {
        const tableSector = sectorMap.get(table.sectorId);
        if (tableSector) {
          result.push({
            ...table,
            sector: tableSector,
            rowIndex: rowIndex++,
          });
        }
      }
    }
  }

  return result;
}

export function getTableRowIndex(
  tableId: UUID,
  tablesWithSectors: TableWithSector[]
): number {
  const table = tablesWithSectors.find(t => t.id === tableId);
  return table?.rowIndex ?? -1;
}

export function checkReservationConflict(
  reservation: Partial<Reservation>,
  existingReservations: Reservation[],
  excludeId?: UUID
): ConflictCheck {
  if (!reservation.tableId || !reservation.startTime || !reservation.endTime) {
    return { hasConflict: false, conflictingReservationIds: [] };
  }

  const conflictingIds: UUID[] = [];
  const newStart = parseISO(reservation.startTime);
  const newEnd = parseISO(reservation.endTime);

  for (const existing of existingReservations) {
    if (excludeId && existing.id === excludeId) continue;
    if (existing.tableId !== reservation.tableId) continue;
    if (existing.status === 'CANCELLED') continue;

    const existingStart = parseISO(existing.startTime);
    const existingEnd = parseISO(existing.endTime);

    if (
      areIntervalsOverlapping(
        { start: newStart, end: newEnd },
        { start: existingStart, end: existingEnd }
      )
    ) {
      conflictingIds.push(existing.id);
    }
  }

  return {
    hasConflict: conflictingIds.length > 0,
    conflictingReservationIds: conflictingIds,
    reason: conflictingIds.length > 0 ? 'overlap' : undefined,
  };
}

export function findAlternativeTables(
  tables: Table[],
  partySize: number,
  excludeTableId?: UUID
): Table[] {
  return tables
    .filter(t => t.id !== excludeTableId)
    .filter(t => partySize >= t.capacity.min && partySize <= t.capacity.max)
    .sort((a, b) => a.capacity.max - b.capacity.max);
}

export function findAlternativeTimeSlots(
  tableId: UUID,
  startTime: Date,
  durationMinutes: number,
  reservations: Reservation[]
): Date[] {
  const alternatives: Date[] = [];
  const offsets = [-30, -15, 15, 30];

  for (const offset of offsets) {
    const altStart = new Date(startTime.getTime() + offset * 60 * 1000);
    const altEnd = new Date(altStart.getTime() + durationMinutes * 60 * 1000);

    const conflict = checkReservationConflict(
      {
        tableId,
        startTime: altStart.toISOString(),
        endTime: altEnd.toISOString(),
      },
      reservations
    );

    if (!conflict.hasConflict) {
      alternatives.push(altStart);
    }
  }

  return alternatives;
}

export function getSectorHeaderPositions(
  sectors: Sector[],
  tables: Table[],
  collapsedSectors: Set<UUID>
): Map<UUID, { startRow: number; tableCount: number }> {
  const positions = new Map<UUID, { startRow: number; tableCount: number }>();
  let currentRow = 0;

  const sortedSectors = [...sectors].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const sector of sortedSectors) {
    const sectorTables = tables.filter(t => t.sectorId === sector.id);
    const tableCount = collapsedSectors.has(sector.id) ? 0 : sectorTables.length;

    positions.set(sector.id, { startRow: currentRow, tableCount });
    currentRow += tableCount;
  }

  return positions;
}

export function getGridDimensions(
  tablesCount: number,
  totalSlots: number,
  slotWidth: number,
  rowHeight: number
): { width: number; height: number } {
  return {
    width: totalSlots * slotWidth,
    height: tablesCount * rowHeight,
  };
}
