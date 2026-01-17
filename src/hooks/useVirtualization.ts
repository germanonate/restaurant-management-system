import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualizationState {
  scrollLeft: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface VisibleRange {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
}

interface UseVirtualizationOptions {
  columnWidth: number;
  rowHeight: number;
  totalColumns: number;
  totalRows: number;
  overscan?: number; // Extra items to render outside viewport
}

interface UseVirtualizationReturn {
  visibleRange: VisibleRange;
  scrollState: VirtualizationState;
  handleScroll: (scrollLeft: number, scrollTop: number) => void;
  setViewportSize: (width: number, height: number) => void;
}

export function useVirtualization({
  columnWidth,
  rowHeight,
  totalColumns,
  totalRows,
  overscan = 5,
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const [scrollState, setScrollState] = useState<VirtualizationState>({
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  // Use refs for RAF throttling
  const rafRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Calculate visible range with overscan
  const visibleRange: VisibleRange = {
    startCol: Math.max(0, Math.floor(scrollState.scrollLeft / columnWidth) - overscan),
    endCol: Math.min(
      totalColumns,
      Math.ceil((scrollState.scrollLeft + scrollState.viewportWidth) / columnWidth) + overscan
    ),
    startRow: Math.max(0, Math.floor(scrollState.scrollTop / rowHeight) - overscan),
    endRow: Math.min(
      totalRows,
      Math.ceil((scrollState.scrollTop + scrollState.viewportHeight) / rowHeight) + overscan
    ),
  };

  // Throttled scroll handler using RAF
  const handleScroll = useCallback((scrollLeft: number, scrollTop: number) => {
    pendingScrollRef.current = { left: scrollLeft, top: scrollTop };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingScrollRef.current) {
          setScrollState((prev) => ({
            ...prev,
            scrollLeft: pendingScrollRef.current!.left,
            scrollTop: pendingScrollRef.current!.top,
          }));
        }
        rafRef.current = null;
      });
    }
  }, []);

  const setViewportSize = useCallback((width: number, height: number) => {
    setScrollState((prev) => ({
      ...prev,
      viewportWidth: width,
      viewportHeight: height,
    }));
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    visibleRange,
    scrollState,
    handleScroll,
    setViewportSize,
  };
}

// Helper to check if an item is in the visible range
export function isInVisibleRange(
  itemStart: number,
  itemEnd: number,
  rangeStart: number,
  rangeEnd: number
): boolean {
  return itemEnd > rangeStart && itemStart < rangeEnd;
}
