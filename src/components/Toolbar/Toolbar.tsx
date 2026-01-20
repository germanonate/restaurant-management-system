import { useMemo, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Search,
  X,
  Filter,
  ChevronDown,
  Plus,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LazyCalendar } from '@/components/ui/lazy-calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservationActions } from '@/hooks/useReservationActions';
import { LazyReservationSheet } from '@/components/ReservationBlock/components/ReservationSheet/LazyReservationSheet';
import { UndoRedoControls } from './components/UndoRedoControls';
import { ZoomControls } from './components/ZoomControls';
import {
  getNextZoomLevel,
  getPreviousZoomLevel,
  handleSectorToggle as calculateSectorToggle,
  areAllSectorsSelected,
} from './constants/toolbarConstants';
import { computeReservationCounts } from './utils/filterCalculations';
import type { Priority, ReservationStatus, UUID } from '@/types/models';
import { STATUS_LABELS } from '@/types/models';

export function Toolbar() {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const setSelectedDate = useReservationStore((state) => state.setSelectedDate);
  const filters = useReservationStore((state) => state.filters);
  const setFilters = useReservationStore((state) => state.setFilters);
  const clearFilters = useReservationStore((state) => state.clearFilters);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const setZoomLevel = useReservationStore((state) => state.setZoomLevel);
  const sectors = useReservationStore((state) => state.sectors);
  const undo = useReservationStore((state) => state.undo);
  const redo = useReservationStore((state) => state.redo);
  const canUndo = useReservationStore((state) => state.canUndo);
  const canRedo = useReservationStore((state) => state.canRedo);
  const loadTestData = useReservationStore((state) => state.loadTestData);
  const testDataLoaded = useReservationStore((state) => state.testDataLoaded);
  const reservations = useReservationStore((state) => state.reservations);
  const tables = useReservationStore((state) => state.tables);

  // Use lightweight actions hook
  const { createReservation } = useReservationActions();

  // Compute counts for selected day
  const { totalCount, filteredCount } = useMemo(() => {
    return computeReservationCounts(
      reservations,
      selectedDate,
      filters.sectorIds,
      filters.status,
      filters.searchQuery,
      tables
    );
  }, [reservations, selectedDate, filters.sectorIds, filters.status, filters.searchQuery, tables]);

  const [searchValue, setSearchValue] = useState(filters.searchQuery);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleCreateReservation = useCallback(
    (data: {
      customer: { name: string; phone: string; email?: string; notes?: string };
      partySize: number;
      durationMinutes: number;
      status: ReservationStatus;
      priority: Priority;
      notes?: string;
      tableId?: UUID;
      startTime?: string;
    }) => {
      if (!data.tableId || !data.startTime) {
        return { success: false, error: 'Table and time are required' };
      }

      const result = createReservation({
        tableId: data.tableId,
        customer: data.customer,
        partySize: data.partySize,
        startTime: parseISO(data.startTime),
        durationMinutes: data.durationMinutes,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
      });

      if (result.success) {
        setCreateSheetOpen(false);
      }

      return result;
    },
    [createReservation]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      filters.sectorIds.length > 0 ||
      filters.status !== null ||
      filters.searchQuery.length > 0
    );
  }, [filters]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      // Debounce would go here in production
      setFilters({ searchQuery: value });
    },
    [setFilters]
  );

  const handleSectorToggle = useCallback(
    (sectorId: UUID) => {
      const newSectorIds = calculateSectorToggle(filters.sectorIds, sectorId, sectors);
      setFilters({ sectorIds: newSectorIds });
    },
    [filters.sectorIds, sectors, setFilters]
  );

  const handleSelectAllSectors = useCallback(() => {
    if (areAllSectorsSelected(filters.sectorIds, sectors.length)) {
      setFilters({ sectorIds: [] });
    } else {
      setFilters({ sectorIds: sectors.map((s) => s.id) });
    }
  }, [filters.sectorIds, sectors, setFilters]);

  const allSectorsSelected = areAllSectorsSelected(filters.sectorIds, sectors.length);

  const handleStatusChange = useCallback(
    (value: string) => {
      setFilters({
        status: value === 'all' ? null : (value as ReservationStatus),
      });
    },
    [setFilters]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setSearchValue('');
  }, [clearFilters]);

  const handleZoomIn = useCallback(() => {
    const nextZoom = getNextZoomLevel(zoomLevel);
    if (nextZoom !== zoomLevel) {
      setZoomLevel(nextZoom);
    }
  }, [zoomLevel, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    const prevZoom = getPreviousZoomLevel(zoomLevel);
    if (prevZoom !== zoomLevel) {
      setZoomLevel(prevZoom);
    }
  }, [zoomLevel, setZoomLevel]);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-white shrink-0">
      {/* Desktop layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal gap-2"
                aria-label={`Selected date: ${format(selectedDate, 'PPP')}`}
              >
                <CalendarIcon className="h-4 w-4 text-[rgb(255,147,67)]" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <LazyCalendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Sector filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4 text-[rgb(255,147,67)]" />
                Sectors
                {filters.sectorIds.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-[rgb(255,147,67)] text-white"
                  >
                    {filters.sectorIds.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem
                onClick={handleSelectAllSectors}
                onSelect={(e) => e.preventDefault()}
              >
                {allSectorsSelected ? 'Deselect All' : 'Select All'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sectors.map((sector) => (
                <DropdownMenuCheckboxItem
                  key={sector.id}
                  checked={filters.sectorIds.length === 0 || filters.sectorIds.includes(sector.id)}
                  onCheckedChange={() => handleSectorToggle(sector.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: sector.color }}
                  />
                  {sector.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status filter */}
          <Select
            value={filters.status ?? 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name or phone..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-[220px]"
              aria-label="Search reservations by name or phone"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}

          {/* Results indicator */}
          <span className="text-sm text-muted-foreground">
            Showing {filteredCount} of {totalCount}
          </span>
        </div>

        {/* Undo/Redo, Zoom controls and Create button */}
        <div className="flex items-center gap-3">
          <UndoRedoControls
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo()}
            canRedo={canRedo()}
          />

          <ZoomControls
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-[rgb(255,147,67)] hover:bg-[rgb(235,127,47)]">
                <Plus className="h-4 w-4" />
                New
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateSheetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => loadTestData()}
                disabled={testDataLoaded}
              >
                <Database className="h-4 w-4 mr-2" />
                {testDataLoaded ? 'Test Data Added' : 'Add Test Data'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Create Reservation Sheet */}
      <LazyReservationSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        mode="create"
        onSubmit={handleCreateReservation}
      />
    </div>
  );
}
