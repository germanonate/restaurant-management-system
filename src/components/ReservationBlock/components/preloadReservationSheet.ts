// Track if preload has been initiated to prevent multiple loads
let preloadInitiated = false;

// Preload function - only runs once, deferred to idle time
export function preloadReservationSheet(): void {
  if (preloadInitiated) return;
  preloadInitiated = true;

  const schedulePreload = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
  schedulePreload(() => {
    import('./ReservationSheet');
  });
}
