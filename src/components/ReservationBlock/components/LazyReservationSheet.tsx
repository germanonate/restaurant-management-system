import { lazy, Suspense, useEffect } from 'react';
import type { ComponentProps } from 'react';
import { preloadReservationSheet } from './preloadReservationSheet';

// Lazy load the heavy ReservationSheet component
const ReservationSheetLazy = lazy(() =>
  import('./ReservationSheet').then((module) => ({
    default: module.ReservationSheet,
  }))
);

// Re-export with same props, wrapped in Suspense
export function LazyReservationSheet(props: ComponentProps<typeof ReservationSheetLazy>) {
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
