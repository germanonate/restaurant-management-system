import type { UUID } from '@/types/models';
import type { Reservation } from '@/types/models';
import { parseISO, isSameDay, addMinutes } from 'date-fns';

/**
 * Get reservations for a specific date, excluding cancelled reservations
 * and optionally excluding a specific reservation (useful for edit mode)
 */
export function getDateReservations(
  reservations: Reservation[],
  selectedDate: Date,
  excludeReservationId?: UUID
): Reservation[] {
  return reservations.filter((r) => {
    if (r.status === 'CANCELLED') return false;
    if (excludeReservationId && r.id === excludeReservationId) return false;
    return isSameDay(parseISO(r.startTime), selectedDate);
  });
}

/**
 * Check if a time slot conflicts with existing reservations for a table
 */
export function hasTimeConflict(
  tableId: UUID,
  startTime: Date,
  duration: number,
  dateReservations: Reservation[]
): boolean {
  const endTime = addMinutes(startTime, duration);
  return dateReservations.some((r) => {
    if (r.tableId !== tableId) return false;
    const rStart = parseISO(r.startTime);
    const rEnd = parseISO(r.endTime);
    // Check for overlap
    return startTime < rEnd && endTime > rStart;
  });
}

/**
 * Check if selected table has adequate capacity for party size
 */
export function isTableCapacityValid(
  tableCapacity: { min: number; max: number } | undefined,
  partySize: number
): boolean {
  if (!tableCapacity) return true;
  return partySize >= tableCapacity.min && partySize <= tableCapacity.max;
}
