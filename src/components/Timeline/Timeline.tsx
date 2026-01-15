import { useRef, useCallback, memo } from 'react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineSidebar } from './TimelineSidebar';
import { TimelineGrid } from './TimelineGrid';

const SIDEBAR_WIDTH = 160;

export const Timeline = memo(function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
