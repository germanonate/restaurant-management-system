import { useRef, useCallback, useEffect, memo } from 'react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineSidebar } from './TimelineSidebar';
import { TimelineGrid } from './TimelineGrid';
import { useReservationStore } from '@/stores/reservationStore';
import { getCurrentTimePosition, BASE_SLOT_WIDTH } from '@/utils/timeCalculations';

const SIDEBAR_WIDTH = 160;

export const Timeline = memo(function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const selectedDate = useReservationStore((state) => state.selectedDate);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const hasScrolledRef = useRef(false);

  // Scroll to current time on initial mount only
  useEffect(() => {
    if (hasScrolledRef.current || !scrollContainerRef.current) return;

    const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
    const currentTimePosition = getCurrentTimePosition(selectedDate, slotWidth);

    // If current time is visible (not null), scroll to show it on the left with some padding
    if (currentTimePosition !== null) {
      const padding = 50; // Small padding from the left edge
      scrollContainerRef.current.scrollLeft = Math.max(0, currentTimePosition - padding);
      hasScrolledRef.current = true;
    }
  }, [selectedDate, zoomLevel]);

  // Sync scroll positions
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollTop } = scrollContainerRef.current;

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }

    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = scrollTop;
    }
  }, []);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-white"
      role="region"
      aria-label="Reservation timeline"
    >
      {/* Header row with sticky time labels */}
      <div
        ref={headerRef}
        className="flex overflow-hidden shrink-0"
        aria-hidden="true"
      >
        <TimelineHeader sidebarWidth={SIDEBAR_WIDTH} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with table names */}
        <div
          ref={sidebarRef}
          className="overflow-hidden shrink-0"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <TimelineSidebar width={SIDEBAR_WIDTH} />
        </div>

        {/* Scrollable grid area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          <TimelineGrid />
        </div>
      </div>
    </div>
  );
});
