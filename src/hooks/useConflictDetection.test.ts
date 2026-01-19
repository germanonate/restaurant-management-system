import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConflictDetection } from './useConflictDetection';
import { useReservationStore } from '@/stores/reservationStore';
import type { Reservation, Table } from '@/types/models';

vi.mock('@/stores/reservationStore');

const createReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'res-1',
  tableId: 'table-1',
  customer: { name: 'Test', phone: '123' },
  partySize: 4,
  startTime: '2024-01-15T12:00:00',
  endTime: '2024-01-15T14:00:00',
  durationMinutes: 120,
  status: 'CONFIRMED',
  priority: 'STANDARD',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
});

const createTable = (overrides: Partial<Table> = {}): Table => ({
  id: 'table-1',
  name: 'Table 1',
  sectorId: 'sector-1',
  capacity: { min: 2, max: 6 },
  sortOrder: 0,
  ...overrides,
});

describe('useConflictDetection', () => {
  let mockReservations: Reservation[];
  let mockTables: Table[];

  beforeEach(() => {
    mockReservations = [];
    mockTables = [];

    vi.mocked(useReservationStore).mockImplementation((selector) => {
      const state = {
        reservations: mockReservations,
        tables: mockTables,
      };
      return selector(state as never);
    });
  });

  describe('checkConflict', () => {
    it('should return no conflict when no reservations exist', () => {
      mockReservations = [];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
      expect(conflict.conflictingReservationIds).toHaveLength(0);
    });

    it('should return no conflict when reservation is on different table', () => {
      mockReservations = [
        createReservation({ tableId: 'table-2' }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });

    it('should return no conflict when times do not overlap', () => {
      mockReservations = [
        createReservation({
          startTime: '2024-01-15T10:00:00',
          endTime: '2024-01-15T11:00:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });

    it('should detect conflict when times overlap on same table', () => {
      mockReservations = [
        createReservation({
          id: 'existing-res',
          startTime: '2024-01-15T13:00:00',
          endTime: '2024-01-15T15:00:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingReservationIds).toContain('existing-res');
      expect(conflict.reason).toBe('overlap');
    });

    it('should detect conflict when new reservation is fully inside existing', () => {
      mockReservations = [
        createReservation({
          id: 'existing-res',
          startTime: '2024-01-15T11:00:00',
          endTime: '2024-01-15T16:00:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(true);
    });

    it('should detect conflict when existing reservation is fully inside new', () => {
      mockReservations = [
        createReservation({
          id: 'existing-res',
          startTime: '2024-01-15T12:30:00',
          endTime: '2024-01-15T13:30:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(true);
    });

    it('should ignore cancelled reservations', () => {
      mockReservations = [
        createReservation({
          status: 'CANCELLED',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T14:00:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });

    it('should exclude specified reservation by ID', () => {
      mockReservations = [
        createReservation({
          id: 'res-to-exclude',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T14:00:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict(
        {
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T14:00:00',
        },
        'res-to-exclude'
      );

      expect(conflict.hasConflict).toBe(false);
    });

    it('should return multiple conflicting reservation IDs', () => {
      mockReservations = [
        createReservation({
          id: 'conflict-1',
          startTime: '2024-01-15T12:30:00',
          endTime: '2024-01-15T13:30:00',
        }),
        createReservation({
          id: 'conflict-2',
          startTime: '2024-01-15T13:00:00',
          endTime: '2024-01-15T14:30:00',
        }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T15:00:00',
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingReservationIds).toHaveLength(2);
      expect(conflict.conflictingReservationIds).toContain('conflict-1');
      expect(conflict.conflictingReservationIds).toContain('conflict-2');
    });

    it('should return no conflict when missing tableId', () => {
      mockReservations = [createReservation()];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });

    it('should return no conflict when missing startTime', () => {
      mockReservations = [createReservation()];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        endTime: '2024-01-15T14:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });

    it('should return no conflict when missing endTime', () => {
      mockReservations = [createReservation()];

      const { result } = renderHook(() => useConflictDetection());
      const conflict = result.current.checkConflict({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
      });

      expect(conflict.hasConflict).toBe(false);
    });
  });

  describe('getConflictResolutions', () => {
    it('should return empty results when missing startTime', () => {
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        durationMinutes: 120,
      });

      expect(resolutions.alternativeTables).toHaveLength(0);
      expect(resolutions.alternativeTimeSlots).toHaveLength(0);
    });

    it('should return empty results when missing tableId', () => {
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 120,
      });

      expect(resolutions.alternativeTables).toHaveLength(0);
      expect(resolutions.alternativeTimeSlots).toHaveLength(0);
    });

    it('should return empty results when missing durationMinutes', () => {
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
      });

      expect(resolutions.alternativeTables).toHaveLength(0);
      expect(resolutions.alternativeTimeSlots).toHaveLength(0);
    });

    it('should return alternative tables that fit party size', () => {
      mockTables = [
        createTable({ id: 'table-1', capacity: { min: 2, max: 4 } }),
        createTable({ id: 'table-2', capacity: { min: 2, max: 6 } }),
        createTable({ id: 'table-3', capacity: { min: 6, max: 10 } }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 120,
        partySize: 4,
      });

      // Should include table-2 (fits 4), exclude table-1 (current), exclude table-3 (min 6)
      expect(resolutions.alternativeTables).toHaveLength(1);
      expect(resolutions.alternativeTables[0].id).toBe('table-2');
    });

    it('should exclude current table from alternatives', () => {
      mockTables = [
        createTable({ id: 'table-1', capacity: { min: 2, max: 6 } }),
        createTable({ id: 'table-2', capacity: { min: 2, max: 6 } }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 120,
        partySize: 4,
      });

      expect(resolutions.alternativeTables.map(t => t.id)).not.toContain('table-1');
    });

    it('should sort alternative tables by capacity (smallest first)', () => {
      mockTables = [
        createTable({ id: 'table-1', capacity: { min: 2, max: 4 } }),
        createTable({ id: 'table-large', capacity: { min: 2, max: 10 } }),
        createTable({ id: 'table-medium', capacity: { min: 2, max: 6 } }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 120,
        partySize: 4,
      });

      expect(resolutions.alternativeTables[0].id).toBe('table-medium');
      expect(resolutions.alternativeTables[1].id).toBe('table-large');
    });

    it('should return alternative time slots without conflicts', () => {
      mockReservations = [];
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 60,
        partySize: 4,
      });

      // Should suggest -30, -15, +15, +30 min offsets
      expect(resolutions.alternativeTimeSlots.length).toBeGreaterThan(0);
    });

    it('should exclude time slots that have conflicts', () => {
      mockReservations = [
        createReservation({
          id: 'blocking-res',
          startTime: '2024-01-15T12:15:00',
          endTime: '2024-01-15T13:15:00',
        }),
      ];
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 60,
        partySize: 4,
      });

      // +15 slot would conflict with blocking-res
      const slotTimes = resolutions.alternativeTimeSlots.map(d => d.toISOString());
      expect(slotTimes).not.toContain('2024-01-15T12:15:00.000Z');
    });

    it('should use default party size of 2 when not specified', () => {
      mockTables = [
        createTable({ id: 'table-1', capacity: { min: 4, max: 6 } }),
        createTable({ id: 'table-2', capacity: { min: 2, max: 4 } }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions({
        tableId: 'table-1',
        startTime: '2024-01-15T12:00:00',
        durationMinutes: 120,
        // partySize not specified, defaults to 2
      });

      // table-2 fits party of 2, table-1 (current) is excluded
      expect(resolutions.alternativeTables).toHaveLength(1);
      expect(resolutions.alternativeTables[0].id).toBe('table-2');
    });

    it('should exclude reservation by ID when finding alternative slots', () => {
      mockReservations = [
        createReservation({
          id: 'current-res',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
      ];
      mockTables = [createTable()];

      const { result } = renderHook(() => useConflictDetection());
      const resolutions = result.current.getConflictResolutions(
        {
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          durationMinutes: 60,
          partySize: 4,
        },
        'current-res'
      );

      // Should find slots because current-res is excluded
      expect(resolutions.alternativeTimeSlots.length).toBeGreaterThan(0);
    });
  });

  describe('hasConflictingReservations', () => {
    it('should return true if any reservation ID exists in store', () => {
      mockReservations = [
        createReservation({ id: 'res-1' }),
        createReservation({ id: 'res-2' }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const hasConflicts = result.current.hasConflictingReservations(['res-1', 'res-3']);

      expect(hasConflicts).toBe(true);
    });

    it('should return false if no reservation IDs exist in store', () => {
      mockReservations = [
        createReservation({ id: 'res-1' }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const hasConflicts = result.current.hasConflictingReservations(['res-99', 'res-100']);

      expect(hasConflicts).toBe(false);
    });

    it('should return false for empty array', () => {
      mockReservations = [createReservation()];

      const { result } = renderHook(() => useConflictDetection());
      const hasConflicts = result.current.hasConflictingReservations([]);

      expect(hasConflicts).toBe(false);
    });

    it('should return true if all reservation IDs exist', () => {
      mockReservations = [
        createReservation({ id: 'res-1' }),
        createReservation({ id: 'res-2' }),
      ];

      const { result } = renderHook(() => useConflictDetection());
      const hasConflicts = result.current.hasConflictingReservations(['res-1', 'res-2']);

      expect(hasConflicts).toBe(true);
    });
  });
});
