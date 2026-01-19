import { useMemo } from 'react';
import type { Sector, Table, UUID } from '@/types/models';
import { getTablesWithSectors } from '../utils/gridHelpers';

interface GridLayoutParams {
  sectors: Sector[];
  tables: Table[];
  collapsedSectors: Set<UUID>;
  filterSectorIds: UUID[];
  rowHeight: number;
  sectorHeaderHeight: number;
}

interface GridLayoutResult {
  sortedSectors: Sector[];
  tablesWithSectors: ReturnType<typeof getTablesWithSectors>;
  tableYOffsets: Map<UUID, number>;
  sectorHeaderPositions: Array<{ id: UUID; y: number }>;
  gridHeight: number;
}

export function useGridLayout({
  sectors,
  tables,
  collapsedSectors,
  filterSectorIds,
  rowHeight,
  sectorHeaderHeight,
}: GridLayoutParams): GridLayoutResult {
  const sortedSectors = useMemo(() => {
    const filtered =
      filterSectorIds.length > 0 ? sectors.filter((s) => filterSectorIds.includes(s.id)) : sectors;
    return [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sectors, filterSectorIds]);

  const tablesWithSectors = useMemo(
    () => getTablesWithSectors(tables, sortedSectors, collapsedSectors),
    [tables, sortedSectors, collapsedSectors]
  );

  const { tableYOffsets, sectorHeaderPositions } = useMemo(() => {
    const offsets = new Map<UUID, number>();
    const positions: Array<{ id: UUID; y: number }> = [];
    let currentY = 0;

    for (const sector of sortedSectors) {
      positions.push({ id: sector.id, y: currentY });
      currentY += sectorHeaderHeight;
      const sectorTables = tablesWithSectors.filter((t) => t.sector.id === sector.id);
      for (const table of sectorTables) {
        offsets.set(table.id, currentY);
        currentY += rowHeight;
      }
    }

    return { tableYOffsets: offsets, sectorHeaderPositions: positions };
  }, [sortedSectors, tablesWithSectors, sectorHeaderHeight, rowHeight]);

  const gridHeight = sortedSectors.length * sectorHeaderHeight + tablesWithSectors.length * rowHeight;

  return {
    sortedSectors,
    tablesWithSectors,
    tableYOffsets,
    sectorHeaderPositions,
    gridHeight,
  };
}
