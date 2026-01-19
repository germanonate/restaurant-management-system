import { memo, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useReservationStore } from '@/stores/reservationStore';
import type { Sector, Table, UUID } from '@/types/models';
import { BASE_ROW_HEIGHT } from '../utils/timeCalculations';

const BASE_SECTOR_HEADER_HEIGHT = 32;

interface TimelineSidebarProps {
  width: number;
}

interface SectorGroupProps {
  sector: Sector;
  tables: Table[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  rowHeight: number;
  sectorHeaderHeight: number;
}

interface TableRowProps {
  table: Table;
  rowHeight: number;
}

// Memoized table row component
const TableRow = memo(function TableRow({ table, rowHeight }: TableRowProps) {
  return (
    <li
      className="flex items-center px-3 border-b border-border bg-white list-none"
      style={{ height: rowHeight }}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{table.name}</span>
        <span className="text-xs text-muted-foreground">
          {table.capacity.min}-{table.capacity.max} guests
        </span>
      </div>
    </li>
  );
});

const SectorGroup = memo(function SectorGroup({
  sector,
  tables,
  isCollapsed,
  onToggleCollapse,
  rowHeight,
  sectorHeaderHeight,
}: SectorGroupProps) {
  return (
    <li className="list-none">
      {/* Sector header */}
      <button
        type="button"
        className="flex items-center gap-2 px-2 w-full bg-muted/50 border-b border-border cursor-pointer hover:bg-muted transition-colors text-left"
        style={{ height: sectorHeaderHeight }}
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls={`sector-${sector.id}-tables`}
      >
        <span className="h-5 w-5 flex items-center justify-center" aria-hidden="true">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: sector.color }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium truncate">{sector.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          ({tables.length})
        </span>
      </button>

      {/* Tables */}
      {!isCollapsed && (
        <ul id={`sector-${sector.id}-tables`} className="list-none m-0 p-0">
          {tables.map((table) => (
            <TableRow key={table.id} table={table} rowHeight={rowHeight} />
          ))}
        </ul>
      )}
    </li>
  );
});

export const TimelineSidebar = memo(function TimelineSidebar({
  width,
}: TimelineSidebarProps) {
  const sectors = useReservationStore((state) => state.sectors);
  const tables = useReservationStore((state) => state.tables);
  const collapsedSectors = useReservationStore((state) => state.collapsedSectors);
  const filters = useReservationStore((state) => state.filters);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const toggleSectorCollapse = useReservationStore(
    (state) => state.toggleSectorCollapse
  );

  // Calculate scaled dimensions based on zoom level
  const rowHeight = (BASE_ROW_HEIGHT * zoomLevel) / 100;
  const sectorHeaderHeight = (BASE_SECTOR_HEADER_HEIGHT * zoomLevel) / 100;

  // Filter sectors based on active filter, then sort
  const sortedSectors = useMemo(() => {
    const filtered = filters.sectorIds.length > 0
      ? sectors.filter((s) => filters.sectorIds.includes(s.id))
      : sectors;
    return [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sectors, filters.sectorIds]);

  const getTablesForSector = useCallback(
    (sectorId: UUID) => {
      return tables
        .filter((t) => t.sectorId === sectorId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [tables]
  );

  return (
    <nav
      className="sticky left-0 z-20 bg-white border-r border-border shrink-0"
      style={{ width }}
      aria-label="Tables by sector"
    >
      <ul className="list-none m-0 p-0">
        {sortedSectors.map((sector) => (
          <SectorGroup
          key={sector.id}
          sector={sector}
          tables={getTablesForSector(sector.id)}
          isCollapsed={collapsedSectors.has(sector.id)}
          onToggleCollapse={() => toggleSectorCollapse(sector.id)}
          rowHeight={rowHeight}
          sectorHeaderHeight={sectorHeaderHeight}
        />
        ))}
      </ul>
    </nav>
  );
});
