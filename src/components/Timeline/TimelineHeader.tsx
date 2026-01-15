import { memo, useMemo } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import {
  getTotalSlots,
  slotIndexToTime,
  formatTimeSlot,
  BASE_SLOT_WIDTH,
} from '@/utils/timeCalculations';

interface TimelineHeaderProps {
  sidebarWidth: number;
}

export const TimelineHeader = memo(function TimelineHeader({
  sidebarWidth,
}: TimelineHeaderProps) {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);

  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;
  const totalSlots = getTotalSlots();

  const timeLabels = useMemo(() => {
    const labels: { slot: number; label: string }[] = [];
    // Show label every 30 minutes (every 2 slots)
    for (let i = 0; i <= totalSlots; i += 2) {
      const time = slotIndexToTime(i, selectedDate);
      labels.push({ slot: i, label: formatTimeSlot(time) });
    }
    return labels;
  }, [totalSlots, selectedDate]);

  return (
    <div
      className="sticky top-0 z-30 flex bg-white border-b border-border"
      role="row"
      aria-label="Time slots header"
    >
      {/* Corner spacer */}
      <div
        className="sticky left-0 z-40 bg-white border-r border-border shrink-0"
        style={{ width: sidebarWidth }}
        aria-hidden="true"
      />

      {/* Time slots */}
      <div
        className="relative h-10"
        style={{ width: totalSlots * slotWidth }}
        role="rowheader"
      >
        {timeLabels.map(({ slot, label }) => (
          <div
            key={slot}
            className="absolute top-0 h-full flex items-center justify-center text-xs text-muted-foreground font-medium"
            style={{
              left: slot * slotWidth,
              width: slotWidth * 2,
            }}
            aria-label={label}
          >
            {label}
          </div>
        ))}
        {/* 30-minute vertical lines */}
        {timeLabels.map(({ slot }) => (
          <div
            key={`line-${slot}`}
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: slot * slotWidth }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
});
