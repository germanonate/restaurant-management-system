import { parseISO } from 'date-fns';
import type { UUID, Reservation } from '@/types/models';

/**
 * Compute reservation counts for selected day with filters applied
 */
export interface ReservationCounts {
  totalCount: number;
  filteredCount: number;
}

export function computeReservationCounts(
  reservations: Reservation[],
  selectedDate: Date,
  filterSectorIds: UUID[],
  filterStatus: string | null,
  filterSearchQuery: string,
  tables: Array<{ id: UUID; sectorId: UUID }>
): ReservationCounts {
  let total = 0;
  let filtered = 0;

  for (const reservation of reservations) {
    // Date filter - both counts only include selected day
    const resDate = parseISO(reservation.startTime);
    if (resDate.toDateString() !== selectedDate.toDateString()) {
      continue;
    }

    // Count for total (all reservations for this day)
    total++;

    // Apply additional filters for filtered count
    // Sector filter
    if (filterSectorIds.length > 0) {
      const table = tables.find((t) => t.id === reservation.tableId);
      if (!table || !filterSectorIds.includes(table.sectorId)) {
        continue;
      }
    }

    // Status filter
    if (filterStatus && reservation.status !== filterStatus) {
      continue;
    }

    // Search filter
    if (filterSearchQuery) {
      const query = filterSearchQuery.toLowerCase();
      const matchesName = reservation.customer.name.toLowerCase().includes(query);
      const matchesPhone = reservation.customer.phone.toLowerCase().includes(query);
      if (!matchesName && !matchesPhone) {
        continue;
      }
    }

    filtered++;
  }

  return { totalCount: total, filteredCount: filtered };
}
