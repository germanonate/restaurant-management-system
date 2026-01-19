"use client"

import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';

// Lazy load the Calendar component (which imports react-day-picker)
const CalendarLazy = lazy(() =>
  import('./calendar').then((module) => ({
    default: module.Calendar,
  }))
);

// Simple loading placeholder
function CalendarSkeleton() {
  return (
    <div className="p-3 w-[280px]">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function LazyCalendar(props: ComponentProps<typeof CalendarLazy>) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarLazy {...props} />
    </Suspense>
  );
}
