import { useCallback } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useConflictDetection } from './useConflictDetection';
import type { Reservation, UUID, ReservationStatus, Customer, Priority } from '@/types/models';
import { addMinutes } from 'date-fns';

interface CreateReservationInput {
  tableId: UUID;
  customer: Customer;
  partySize: number;
  startTime: Date;
  durationMinutes: number;
  status?: ReservationStatus;
  priority?: Priority;
  notes?: string;
}

interface UpdateReservationInput {
  customer?: Customer;
  partySize?: number;
  startTime?: Date;
  durationMinutes?: number;
  status?: ReservationStatus;
  priority?: Priority;
  notes?: string;
  tableId?: UUID;
}

/**
 * Lightweight hook that provides reservation actions WITHOUT subscribing to data.
 * Use this in components that only need to perform actions (like ReservationBlock)
 * to avoid unnecessary re-renders when reservations change.
 */
export function useReservationActions() {
  // Get store functions directly - these are stable references that don't cause re-renders
  const store = useReservationStore;

  const { checkConflict } = useConflictDetection();

  const createReservation = useCallback(
    (input: CreateReservationInput): { success: boolean; reservation?: Reservation; error?: string } => {
      const { tableId, customer, partySize, startTime, durationMinutes, status, priority, notes } = input;
      const state = store.getState();

      // Validate party size against table capacity
      const table = state.tables.find((t) => t.id === tableId);
      if (table && (partySize < table.capacity.min || partySize > table.capacity.max)) {
        return {
          success: false,
          error: `Party size must be between ${table.capacity.min} and ${table.capacity.max} for this table`,
        };
      }

      // Validate duration
      if (durationMinutes < 30 || durationMinutes > 360) {
        return {
          success: false,
          error: 'Duration must be between 30 minutes and 6 hours',
        };
      }

      const endTime = addMinutes(startTime, durationMinutes);

      // Check for conflicts
      const conflict = checkConflict({
        tableId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      if (conflict.hasConflict) {
        return {
          success: false,
          error: 'This time slot conflicts with an existing reservation',
        };
      }

      const reservation: Reservation = {
        id: `RES_${Date.now()}`,
        tableId,
        customer,
        partySize,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
        status: status ?? 'CONFIRMED',
        priority: priority ?? 'STANDARD',
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.addReservation(reservation);

      return { success: true, reservation };
    },
    [checkConflict, store]
  );

  const updateReservation = useCallback(
    (id: UUID, input: UpdateReservationInput): { success: boolean; error?: string } => {
      const state = store.getState();
      const existing = state.reservations.find((r) => r.id === id);
      if (!existing) {
        return { success: false, error: 'Reservation not found' };
      }

      const tableId = input.tableId ?? existing.tableId;
      const startTime = input.startTime ?? new Date(existing.startTime);
      const durationMinutes = input.durationMinutes ?? existing.durationMinutes;
      const partySize = input.partySize ?? existing.partySize;

      // Validate party size
      if (input.partySize !== undefined) {
        const table = state.tables.find((t) => t.id === tableId);
        if (table && (partySize < table.capacity.min || partySize > table.capacity.max)) {
          return {
            success: false,
            error: `Party size must be between ${table.capacity.min} and ${table.capacity.max} for this table`,
          };
        }
      }

      // Validate duration
      if (durationMinutes < 30 || durationMinutes > 360) {
        return {
          success: false,
          error: 'Duration must be between 30 minutes and 6 hours',
        };
      }

      const endTime = addMinutes(startTime, durationMinutes);

      // Check for conflicts (excluding current reservation)
      if (input.startTime !== undefined || input.durationMinutes !== undefined || input.tableId !== undefined) {
        const conflict = checkConflict(
          {
            tableId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          },
          id
        );

        if (conflict.hasConflict) {
          return {
            success: false,
            error: 'This time slot conflicts with an existing reservation',
          };
        }
      }

      const updates: Partial<Reservation> = {};

      if (input.customer) updates.customer = input.customer;
      if (input.partySize !== undefined) updates.partySize = input.partySize;
      if (input.startTime) {
        updates.startTime = startTime.toISOString();
        updates.endTime = endTime.toISOString();
      }
      if (input.durationMinutes !== undefined) {
        updates.durationMinutes = durationMinutes;
        updates.endTime = addMinutes(
          input.startTime ?? new Date(existing.startTime),
          durationMinutes
        ).toISOString();
      }
      if (input.status) updates.status = input.status;
      if (input.priority) updates.priority = input.priority;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.tableId) updates.tableId = input.tableId;

      state.updateReservation(id, updates);

      return { success: true };
    },
    [checkConflict, store]
  );

  const deleteReservation = useCallback(
    (id: UUID) => {
      store.getState().deleteReservation(id);
    },
    [store]
  );

  const duplicateReservation = useCallback(
    (id: UUID) => {
      return store.getState().duplicateReservation(id);
    },
    [store]
  );

  const confirmReservation = useCallback(
    (id: UUID) => {
      store.getState().updateReservationStatus(id, 'CONFIRMED');
    },
    [store]
  );

  const seatReservation = useCallback(
    (id: UUID) => {
      store.getState().updateReservationStatus(id, 'SEATED');
    },
    [store]
  );

  const finishReservation = useCallback(
    (id: UUID) => {
      store.getState().updateReservationStatus(id, 'FINISHED');
    },
    [store]
  );

  const markNoShow = useCallback(
    (id: UUID) => {
      store.getState().updateReservationStatus(id, 'NO_SHOW');
    },
    [store]
  );

  const cancelReservation = useCallback(
    (id: UUID) => {
      store.getState().updateReservationStatus(id, 'CANCELLED');
    },
    [store]
  );

  const getReservation = useCallback(
    (id: UUID) => {
      return store.getState().reservations.find((r) => r.id === id);
    },
    [store]
  );

  return {
    createReservation,
    updateReservation,
    deleteReservation,
    duplicateReservation,
    confirmReservation,
    seatReservation,
    finishReservation,
    markNoShow,
    cancelReservation,
    getReservation,
  };
}
