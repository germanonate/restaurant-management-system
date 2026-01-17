import { lazy, Suspense, useEffect } from 'react';
import type { ComponentProps } from 'react';

// Lazy load the heavy ReservationSheet component
const ReservationSheetLazy = lazy(() =>
  import('./ReservationSheet').then((module) => ({
    default: module.ReservationSheet,
  }))
);

// Preload function to call after initial render
export function preloadReservationSheet() {
  import('./ReservationSheet');
}

// Re-export with same props, wrapped in Suspense
export function LazyReservationSheet(
  props: ComponentProps<typeof ReservationSheetLazy>
) {
  // Preload on mount so it's ready when needed
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
