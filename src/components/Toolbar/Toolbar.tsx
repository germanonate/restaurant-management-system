import { useMemo, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Filter,
  ChevronDown,
  Plus,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useReservationStore } from '@/stores/reservationStore';
import { useReservations } from '@/hooks/useReservations';
import { ReservationSheet } from '@/components/ReservationBlock/ReservationSheet';
import type { ReservationStatus, UUID } from '@/types/models';
import { STATUS_LABELS } from '@/types/models';
import { cn } from '@/lib/utils';

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

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

  const { totalCount, filteredCount, createReservation } = useReservations();

  const [searchValue, setSearchValue] = useState(filters.searchQuery);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileDatePickerOpen, setMobileDatePickerOpen] = useState(false);

  const handleCreateReservation = useCallback(
    (data: {
      customer: { name: string; phone: string; email?: string; notes?: string };
      partySize: number;
      durationMinutes: number;
      status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'FINISHED' | 'NO_SHOW' | 'CANCELLED';
      priority: 'STANDARD' | 'VIP' | 'LARGE_GROUP';
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
      let newSectorIds: UUID[];

      if (filters.sectorIds.length === 0) {
        // Currently showing all - uncheck means select all except this one
        newSectorIds = sectors.filter((s) => s.id !== sectorId).map((s) => s.id);
      } else if (filters.sectorIds.includes(sectorId)) {
        // Remove from selection
        newSectorIds = filters.sectorIds.filter((id) => id !== sectorId);
        // If we unchecked the last one, clear filter to show all
        if (newSectorIds.length === 0) {
          newSectorIds = [];
        }
      } else {
        // Add to selection
        newSectorIds = [...filters.sectorIds, sectorId];
        // If all are now selected, clear filter to show all
        if (newSectorIds.length === sectors.length) {
          newSectorIds = [];
        }
      }

      setFilters({ sectorIds: newSectorIds });
    },
    [filters.sectorIds, sectors, setFilters]
  );

  const handleSelectAllSectors = useCallback(() => {
    // If all are selected (or none selected showing all), clear the filter
    // Otherwise, select all sectors
    if (filters.sectorIds.length === 0 || filters.sectorIds.length === sectors.length) {
      setFilters({ sectorIds: [] });
    } else {
      setFilters({ sectorIds: sectors.map((s) => s.id) });
    }
  }, [filters.sectorIds.length, sectors, setFilters]);

  const allSectorsSelected = filters.sectorIds.length === 0 || filters.sectorIds.length === sectors.length;

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
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  }, [zoomLevel, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  }, [zoomLevel, setZoomLevel]);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-white shrink-0">
      {/* Desktop layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
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
              <Calendar
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
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={undo}
                    disabled={!canUndo()}
                    aria-label="Undo"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={!canRedo()}
                    aria-label="Redo"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel === ZOOM_LEVELS[0]}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setCreateSheetOpen(true)}
            className="gap-2 bg-[rgb(255,147,67)] hover:bg-[rgb(235,127,47)]"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Date picker */}
          <Popover open={mobileDatePickerOpen} onOpenChange={setMobileDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-left font-normal gap-2 flex-1"
                aria-label={`Selected date: ${format(selectedDate, 'PPP')}`}
              >
                <CalendarIcon className="h-4 w-4 text-[rgb(255,147,67)]" />
                {format(selectedDate, 'PP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setMobileDatePickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Filters toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={cn(
              'gap-1',
              hasActiveFilters && 'border-[rgb(255,147,67)]'
            )}
          >
            <Filter className="h-4 w-4 text-[rgb(255,147,67)]" />
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="bg-[rgb(255,147,67)] text-white text-xs px-1"
              >
                {(filters.sectorIds.length > 0 ? 1 : 0) +
                  (filters.status ? 1 : 0) +
                  (filters.searchQuery ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {/* Create button */}
          <Button
            size="sm"
            onClick={() => setCreateSheetOpen(true)}
            className="gap-1 bg-[rgb(255,147,67)] hover:bg-[rgb(235,127,47)]"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">New</span>
          </Button>

          {/* Undo/Redo */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={undo}
                    disabled={!canUndo()}
                    aria-label="Undo"
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={redo}
                    disabled={!canRedo()}
                    aria-label="Redo"
                  >
                    <Redo2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoomLevel === ZOOM_LEVELS[0]}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs font-medium w-8 text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Collapsible filters */}
        {isFiltersOpen && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name or phone..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                aria-label="Search reservations"
              />
            </div>

            <div className="flex gap-2">
              {/* Sector filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    Sectors
                    {filters.sectorIds.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 bg-[rgb(255,147,67)] text-white text-xs px-1"
                      >
                        {filters.sectorIds.length}
                      </Badge>
                    )}
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
                <SelectTrigger className="flex-1" aria-label="Filter by status">
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
            </div>

            {/* Results and clear */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {filteredCount} of {totalCount}
              </span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Reservation Sheet */}
      <ReservationSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        mode="create"
        onSubmit={handleCreateReservation}
      />
    </div>
  );
}
