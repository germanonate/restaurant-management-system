import { lazy, Suspense, useEffect } from 'react';
import type { ComponentProps } from 'react';

// Lazy load the heavy ReservationSheet component
const ReservationSheetLazy = lazy(() =>
  import('./ReservationSheet').then((module) => ({
    default: module.ReservationSheet,
  }))
);

// Track if preload has been initiated to prevent multiple loads
let preloadInitiated = false;

// Preload function - only runs once, deferred to idle time
export function preloadReservationSheet() {
  if (preloadInitiated) return;
  preloadInitiated = true;

  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
  schedulePreload(() => {
    import('./ReservationSheet');
  });
}

// Re-export with same props, wrapped in Suspense
export function LazyReservationSheet(
  props: ComponentProps<typeof ReservationSheetLazy>
) {
  // Preload once after initial app render settles
  useEffect(() => {
    preloadReservationSheet();
  }, []);

  // Don't render anything if not open
  if (!props.open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ReservationSheetLazy {...props} />
    </Suspense>
  );
}
