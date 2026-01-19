import { useRef, useCallback, useEffect, memo, useState, startTransition } from 'react';
import { TimelineHeader } from './components/TimelineHeader';
import { TimelineSidebar } from './components/TimelineSidebar';
import { TimelineGrid } from './components/TimelineGrid';
import { useReservationStore } from '@/stores/reservationStore';
import { getCurrentTimePosition, BASE_SLOT_WIDTH } from './utils/timeCalculations';
import { SIDEBAR_WIDTH, SKELETON_CONFIG } from './constants/layoutConstants';
import { createInitialViewport, updateViewportDimensions, type ViewportState } from './constants/types';

export type { ViewportState };

// Skeleton for deferred loading
function TimelineSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <div className={`${SKELETON_CONFIG.borderWidth} ${SKELETON_CONFIG.spinnerSize} border-primary border-t-transparent rounded-full ${SKELETON_CONFIG.animation}`} />
        <span className="text-sm text-muted-foreground">Loading timeline...</span>
      </div>
    </div>
  );
}

export const Timeline = memo(function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  const selectedDate = useReservationStore((state) => state.selectedDate);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const hasScrolledRef = useRef(false);

  // Defer heavy timeline rendering to after initial paint
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    // Use startTransition to mark this as non-urgent, allowing browser to paint first
    startTransition(() => {
      setIsReady(true);
    });
  }, []);

  // Viewport state for virtualization (updated less frequently)
  const [viewport, setViewport] = useState<ViewportState>(createInitialViewport());

  // Refs for throttling
  const rafRef = useRef<number | null>(null);
  const lastScrollRef = useRef({ left: 0, top: 0 });

  // Initialize viewport size
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const updateViewportSize = () => {
      if (scrollContainerRef.current) {
        const dimensions = updateViewportDimensions(scrollContainerRef.current);
        setViewport((prev) => ({
          ...prev,
          ...dimensions,
        }));
      }
    };

    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(scrollContainerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Scroll to current time on initial mount only
  useEffect(() => {
    if (hasScrolledRef.current || !scrollContainerRef.current) return;

    const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
    const currentTimePosition = getCurrentTimePosition(selectedDate, slotWidth);

    if (currentTimePosition !== null) {
      const padding = 50;
      scrollContainerRef.current.scrollLeft = Math.max(0, currentTimePosition - padding);
      hasScrolledRef.current = true;
    }
  }, [selectedDate, zoomLevel]);

  // Optimized scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollTop } = scrollContainerRef.current;

    // Use CSS transform for immediate, GPU-accelerated header/sidebar sync
    if (headerContentRef.current) {
      headerContentRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
    if (sidebarContentRef.current) {
      sidebarContentRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }

    // Only update viewport state when scroll has moved significantly (reduces re-renders)
    const scrollThreshold = 50; // pixels
    const deltaX = Math.abs(scrollLeft - lastScrollRef.current.left);
    const deltaY = Math.abs(scrollTop - lastScrollRef.current.top);

    if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const { scrollLeft, scrollTop } = scrollContainerRef.current;
            lastScrollRef.current = { left: scrollLeft, top: scrollTop };
            setViewport((prev) => ({
              ...prev,
              scrollLeft,
              scrollTop,
            }));
          }
          rafRef.current = null;
        });
      }
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Show skeleton during initial load to reduce TBT
  if (!isReady) {
    return (
      <div
        className="flex flex-col flex-1 overflow-hidden bg-white"
        role="region"
        aria-label="Reservation timeline"
      >
        <TimelineSkeleton />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-white"
      role="region"
      aria-label="Reservation timeline"
    >
      {/* Header row - uses transform for smooth sync */}
      <div className="flex overflow-hidden shrink-0" aria-hidden="true">
        <div
          className="shrink-0 bg-white border-r border-border z-40"
          style={{ width: SIDEBAR_WIDTH }}
        />
        <div className="flex-1 overflow-hidden">
          <div
            ref={headerContentRef}
            style={{ willChange: 'transform' }}
          >
            <TimelineHeader sidebarWidth={0} />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - uses transform for smooth sync */}
        <div
          className="shrink-0 overflow-hidden bg-white border-r border-border z-20"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div
            ref={sidebarContentRef}
            style={{ willChange: 'transform' }}
          >
            <TimelineSidebar width={SIDEBAR_WIDTH} />
          </div>
        </div>

        {/* Scrollable grid area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          <TimelineGrid viewport={viewport} />
        </div>
      </div>
    </div>
  );
});
