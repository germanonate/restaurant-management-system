import { memo, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReservationStore } from '@/stores/reservationStore';
import { getTablesWithSectors } from '@/utils/gridHelpers';
import type { Sector, Table, UUID } from '@/types/models';
import { ROW_HEIGHT } from '@/utils/timeCalculations';

const SECTOR_HEADER_HEIGHT = 32; // h-8 = 32px

interface TimelineSidebarProps {
  width: number;
}

interface SectorGroupProps {
  sector: Sector;
  tables: Table[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SectorGroup = memo(function SectorGroup({
  sector,
  tables,
  isCollapsed,
  onToggleCollapse,
}: SectorGroupProps) {
  return (
    <div role="rowgroup" aria-label={`${sector.name} sector`}>
      {/* Sector header */}
      <div
        className="flex items-center gap-2 px-2 h-8 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted transition-colors"
        onClick={onToggleCollapse}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`sector-${sector.id}-tables`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0"
          aria-hidden="true"
          tabIndex={-1}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: sector.color }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium truncate">{sector.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          ({tables.length})
        </span>
      </div>

      {/* Tables */}
      {!isCollapsed && (
        <div id={`sector-${sector.id}-tables`}>
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center px-3 border-b border-border bg-white"
              style={{ height: ROW_HEIGHT }}
              role="row"
              aria-label={`${table.name}, capacity ${table.capacity.min}-${table.capacity.max} guests`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {table.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {table.capacity.min}-{table.capacity.max} guests
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const TimelineSidebar = memo(function TimelineSidebar({
  width,
}: TimelineSidebarProps) {
  const sectors = useReservationStore((state) => state.sectors);
  const tables = useReservationStore((state) => state.tables);
  const collapsedSectors = useReservationStore((state) => state.collapsedSectors);
  const filters = useReservationStore((state) => state.filters);
  const toggleSectorCollapse = useReservationStore(
    (state) => state.toggleSectorCollapse
  );

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

  // Calculate total content height to match grid
  const tablesWithSectors = useMemo(
    () => getTablesWithSectors(tables, sortedSectors, collapsedSectors),
    [tables, sortedSectors, collapsedSectors]
  );

  const contentHeight = useMemo(() => {
    // Sector headers + visible table rows
    const sectorHeadersHeight = sortedSectors.length * SECTOR_HEADER_HEIGHT;
    const tableRowsHeight = tablesWithSectors.length * ROW_HEIGHT;
    return sectorHeadersHeight + tableRowsHeight;
  }, [sortedSectors.length, tablesWithSectors.length]);

  return (
    <div
      className="sticky left-0 z-20 bg-white border-r border-border shrink-0 overflow-y-auto scrollbar-hide"
      style={{ width }}
      role="rowgroup"
      aria-label="Tables sidebar"
    >
      <div style={{ minHeight: contentHeight }}>
        {sortedSectors.map((sector) => (
          <SectorGroup
            key={sector.id}
            sector={sector}
            tables={getTablesForSector(sector.id)}
            isCollapsed={collapsedSectors.has(sector.id)}
            onToggleCollapse={() => toggleSectorCollapse(sector.id)}
          />
        ))}
      </div>
    </div>
  );
});
