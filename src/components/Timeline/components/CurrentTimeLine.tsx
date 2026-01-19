import { memo, useEffect, useState } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { getCurrentTimePosition, BASE_SLOT_WIDTH } from '../utils/timeCalculations';

export const CurrentTimeLine = memo(function CurrentTimeLine() {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const [position, setPosition] = useState<number | null>(null);

  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;

  useEffect(() => {
    const updatePosition = () => {
      const pos = getCurrentTimePosition(selectedDate, slotWidth);
      setPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [selectedDate, slotWidth]);

  if (position === null) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
      style={{ left: position }}
      aria-hidden="true"
    >
      <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
    </div>
  );
});
