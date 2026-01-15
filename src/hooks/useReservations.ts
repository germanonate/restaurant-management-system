import { useCallback, useMemo } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useConflictDetection } from './useConflictDetection';
import type { Reservation, UUID, ReservationStatus, Customer, Priority } from '@/types/models';
import { addMinutes, parseISO, isSameDay } from 'date-fns';

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

interface UseReservationsReturn {
  // Data
  reservations: Reservation[];
  filteredReservations: Reservation[];
  totalCount: number;
  filteredCount: number;

  // CRUD operations
  createReservation: (input: CreateReservationInput) => { success: boolean; reservation?: Reservation; error?: string };
  updateReservation: (id: UUID, input: UpdateReservationInput) => { success: boolean; error?: string };
  deleteReservation: (id: UUID) => void;
  duplicateReservation: (id: UUID) => Reservation | null;

  // Status operations
  confirmReservation: (id: UUID) => void;
  seatReservation: (id: UUID) => void;
  finishReservation: (id: UUID) => void;
  markNoShow: (id: UUID) => void;
  cancelReservation: (id: UUID) => void;

  // Selection
  selectedReservation: Reservation | null;
  selectReservation: (id: UUID | null) => void;

  // Getters
  getReservation: (id: UUID) => Reservation | undefined;
  getReservationsForTable: (tableId: UUID) => Reservation[];
}

export function useReservations(): UseReservationsReturn {
  const reservations = useReservationStore((state) => state.reservations);
  const filters = useReservationStore((state) => state.filters);
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const tables = useReservationStore((state) => state.tables);
  const addReservation = useReservationStore((state) => state.addReservation);
  const updateReservationStore = useReservationStore((state) => state.updateReservation);
  const deleteReservationStore = useReservationStore((state) => state.deleteReservation);
  const updateReservationStatus = useReservationStore((state) => state.updateReservationStatus);
  const duplicateReservationStore = useReservationStore((state) => state.duplicateReservation);
  const selectedReservationId = useReservationStore((state) => state.selectedReservationId);
  const setSelectedReservation = useReservationStore((state) => state.setSelectedReservation);
  const getReservationById = useReservationStore((state) => state.getReservationById);
  const getReservationsForTableStore = useReservationStore((state) => state.getReservationsForTable);
  const getTableById = useReservationStore((state) => state.getTableById);

  const { checkConflict } = useConflictDetection();

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      // Date filter
      if (!isSameDay(parseISO(reservation.startTime), selectedDate)) {
        return false;
      }

      // Sector filter
      if (filters.sectorIds.length > 0) {
        const table = tables.find((t) => t.id === reservation.tableId);
        if (!table || !filters.sectorIds.includes(table.sectorId)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && reservation.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = reservation.customer.name.toLowerCase().includes(query);
        const matchesPhone = reservation.customer.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, filters, selectedDate, tables]);

  const selectedReservation = useMemo(
    () => (selectedReservationId ? getReservationById(selectedReservationId) ?? null : null),
    [selectedReservationId, getReservationById]
  );

  const createReservation = useCallback(
    (input: CreateReservationInput): { success: boolean; reservation?: Reservation; error?: string } => {
      const { tableId, customer, partySize, startTime, durationMinutes, status, priority, notes } = input;

      // Validate party size against table capacity
      const table = getTableById(tableId);
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

      addReservation(reservation);

      return { success: true, reservation };
    },
    [addReservation, checkConflict, getTableById]
  );

  const updateReservation = useCallback(
    (id: UUID, input: UpdateReservationInput): { success: boolean; error?: string } => {
      const existing = getReservationById(id);
      if (!existing) {
        return { success: false, error: 'Reservation not found' };
      }

      const tableId = input.tableId ?? existing.tableId;
      const startTime = input.startTime ?? parseISO(existing.startTime);
      const durationMinutes = input.durationMinutes ?? existing.durationMinutes;
      const partySize = input.partySize ?? existing.partySize;

      // Validate party size
      if (input.partySize !== undefined) {
        const table = getTableById(tableId);
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
          input.startTime ?? parseISO(existing.startTime),
          durationMinutes
        ).toISOString();
      }
      if (input.status) updates.status = input.status;
      if (input.priority) updates.priority = input.priority;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.tableId) updates.tableId = input.tableId;

      updateReservationStore(id, updates);

      return { success: true };
    },
    [getReservationById, updateReservationStore, checkConflict, getTableById]
  );

  const confirmReservation = useCallback(
    (id: UUID) => updateReservationStatus(id, 'CONFIRMED'),
    [updateReservationStatus]
  );

  const seatReservation = useCallback(
    (id: UUID) => updateReservationStatus(id, 'SEATED'),
    [updateReservationStatus]
  );

  const finishReservation = useCallback(
    (id: UUID) => updateReservationStatus(id, 'FINISHED'),
    [updateReservationStatus]
  );

  const markNoShow = useCallback(
    (id: UUID) => updateReservationStatus(id, 'NO_SHOW'),
    [updateReservationStatus]
  );

  const cancelReservation = useCallback(
    (id: UUID) => updateReservationStatus(id, 'CANCELLED'),
    [updateReservationStatus]
  );

  return {
    reservations,
    filteredReservations,
    totalCount: reservations.length,
    filteredCount: filteredReservations.length,
    createReservation,
    updateReservation,
    deleteReservation: deleteReservationStore,
    duplicateReservation: duplicateReservationStore,
    confirmReservation,
    seatReservation,
    finishReservation,
    markNoShow,
    cancelReservation,
    selectedReservation,
    selectReservation: setSelectedReservation,
    getReservation: getReservationById,
    getReservationsForTable: getReservationsForTableStore,
  };
}
