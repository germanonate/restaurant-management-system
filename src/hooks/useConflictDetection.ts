import { useMemo } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { checkReservationConflict, findAlternativeTables, findAlternativeTimeSlots } from '../components/Timeline/utils/gridHelpers';
import type { Reservation, UUID, ConflictCheck, Table } from '@/types/models';
import { parseISO } from 'date-fns';

interface ConflictResolution {
  alternativeTables: Table[];
  alternativeTimeSlots: Date[];
}

interface UseConflictDetectionReturn {
  checkConflict: (
    reservation: Partial<Reservation>,
    excludeId?: UUID
  ) => ConflictCheck;
  getConflictResolutions: (
    reservation: Partial<Reservation>,
    excludeId?: UUID
  ) => ConflictResolution;
  hasConflictingReservations: (reservationIds: UUID[]) => boolean;
}

export function useConflictDetection(): UseConflictDetectionReturn {
  const reservations = useReservationStore((state) => state.reservations);
  const tables = useReservationStore((state) => state.tables);

  const checkConflict = useMemo(
    () => (reservation: Partial<Reservation>, excludeId?: UUID): ConflictCheck => {
      return checkReservationConflict(reservation, reservations, excludeId);
    },
    [reservations]
  );

  const getConflictResolutions = useMemo(
    () =>
      (reservation: Partial<Reservation>, excludeId?: UUID): ConflictResolution => {
        const result: ConflictResolution = {
          alternativeTables: [],
          alternativeTimeSlots: [],
        };

        if (!reservation.startTime || !reservation.tableId || !reservation.durationMinutes) {
          return result;
        }

        const partySize = reservation.partySize ?? 2;
        result.alternativeTables = findAlternativeTables(
          tables,
          partySize,
          reservation.tableId
        );

        result.alternativeTimeSlots = findAlternativeTimeSlots(
          reservation.tableId,
          parseISO(reservation.startTime),
          reservation.durationMinutes,
          reservations.filter((r) => excludeId ? r.id !== excludeId : true)
        );

        return result;
      },
    [reservations, tables]
  );

  const hasConflictingReservations = useMemo(
    () => (reservationIds: UUID[]): boolean => {
      return reservationIds.some((id) =>
        reservations.some((r) => r.id === id)
      );
    },
    [reservations]
  );

  return {
    checkConflict,
    getConflictResolutions,
    hasConflictingReservations,
  };
}
