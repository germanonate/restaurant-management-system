import { describe, it, expect } from 'vitest';
import { calculateKPIs } from './kpiCalculations';
import type { Reservation, Table } from '@/types/models';
import { parseISO } from 'date-fns';

const selectedDate = parseISO('2024-01-15T12:00:00');

const createReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: `res-${Math.random()}`,
  tableId: 'table-1',
  customer: { name: 'Test', phone: '123' },
  partySize: 4,
  startTime: '2024-01-15T12:00:00',
  endTime: '2024-01-15T14:00:00',
  durationMinutes: 120,
  status: 'CONFIRMED',
  priority: 'NORMAL',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
});

const createTable = (overrides: Partial<Table> = {}): Table => ({
  id: 'table-1',
  name: 'Table 1',
  sectorId: 'sector-1',
  capacity: { min: 2, max: 4 },
  ...overrides,
});

describe('kpiCalculations', () => {
  describe('Daily Utilization', () => {
    it('should return 0% with no reservations', () => {
      const tables = [createTable({ capacity: { min: 2, max: 10 } })];
      const result = calculateKPIs([], tables, selectedDate);

      expect(result.capacityUtilization.value).toBe(0);
      expect(result.capacityUtilization.formatted).toBe('0.0%');
    });

    it('should return 0% with no tables', () => {
      const reservations = [createReservation()];
      const result = calculateKPIs(reservations, [], selectedDate);

      expect(result.capacityUtilization.value).toBe(0);
    });

    it('should calculate correct utilization based on seat-time', () => {
      // 10 seats * 13 hours * 60 min = 7800 seat-minutes available
      const tables = [createTable({ capacity: { min: 2, max: 10 } })];
      // 4 guests * 120 min = 480 seat-minutes used
      const reservations = [createReservation({ partySize: 4, durationMinutes: 120 })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // 480 / 7800 * 100 = 6.15%
      expect(result.capacityUtilization.value).toBeCloseTo(6.15, 1);
    });

    it('should cap utilization at 100%', () => {
      const tables = [createTable({ capacity: { min: 2, max: 2 } })];
      // Way more seat-time than available
      const reservations = Array.from({ length: 50 }, (_, i) =>
        createReservation({
          id: `res-${i}`,
          partySize: 10,
          startTime: '2024-01-15T11:00:00',
          endTime: '2024-01-15T23:00:00',
          durationMinutes: 720,
        })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.capacityUtilization.value).toBe(100);
    });

    it('should exclude cancelled reservations from utilization', () => {
      const tables = [createTable({ capacity: { min: 2, max: 10 } })];
      const reservations = [
        createReservation({ id: 'r1', status: 'CONFIRMED' }),
        createReservation({ id: 'r2', status: 'CANCELLED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // Only 1 reservation should count
      expect(result.capacityUtilization.value).toBeCloseTo(6.15, 1);
    });

    it('should return green status for <70% utilization', () => {
      const tables = [createTable({ capacity: { min: 2, max: 100 } })];
      const reservations = [createReservation({ partySize: 4 })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.capacityUtilization.status).toBe('green');
    });

    it('should return yellow status for 70-90% utilization', () => {
      // Need ~80% utilization
      // 10 seats * 13h * 60min = 7800 available
      // Need 6240 seat-minutes for 80%
      const tables = [createTable({ capacity: { min: 2, max: 10 } })];
      const reservations = [
        createReservation({
          partySize: 8,
          startTime: '2024-01-15T11:00:00',
          endTime: '2024-01-15T24:00:00',
          durationMinutes: 780, // 13 hours
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.capacityUtilization.status).toBe('yellow');
    });

    it('should return red status for >90% utilization', () => {
      const tables = [createTable({ capacity: { min: 2, max: 10 } })];
      const reservations = [
        createReservation({
          partySize: 10,
          startTime: '2024-01-15T11:00:00',
          endTime: '2024-01-15T24:00:00',
          durationMinutes: 780,
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.capacityUtilization.status).toBe('red');
    });
  });

  describe('No-Show Rate', () => {
    it('should return 0% with no completed reservations', () => {
      const tables = [createTable()];
      const reservations = [createReservation({ status: 'PENDING' })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.noShowRate.value).toBe(0);
    });

    it('should calculate correct no-show percentage', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', status: 'FINISHED' }),
        createReservation({ id: 'r2', status: 'FINISHED' }),
        createReservation({ id: 'r3', status: 'NO_SHOW' }),
        createReservation({ id: 'r4', status: 'SEATED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // 1 no-show out of 4 = 25%
      expect(result.noShowRate.value).toBe(25);
    });

    it('should return green status for <5% no-show rate', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 100 }, (_, i) =>
        createReservation({ id: `r-${i}`, status: 'FINISHED' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.noShowRate.status).toBe('green');
    });

    it('should return yellow status for 5-15% no-show rate', () => {
      const tables = [createTable()];
      const reservations = [
        ...Array.from({ length: 9 }, (_, i) =>
          createReservation({ id: `f-${i}`, status: 'FINISHED' })
        ),
        createReservation({ id: 'ns-1', status: 'NO_SHOW' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // 1/10 = 10%
      expect(result.noShowRate.status).toBe('yellow');
    });

    it('should return red status for >15% no-show rate', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'f-1', status: 'FINISHED' }),
        createReservation({ id: 'ns-1', status: 'NO_SHOW' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // 1/2 = 50%
      expect(result.noShowRate.status).toBe('red');
    });
  });

  describe('Cancelled Reservations', () => {
    it('should count cancelled reservations', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', status: 'CONFIRMED' }),
        createReservation({ id: 'r2', status: 'CANCELLED' }),
        createReservation({ id: 'r3', status: 'CANCELLED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.cancelledReservations.value).toBe(2);
      expect(result.cancelledReservations.formatted).toBe('2');
    });

    it('should return green status for 0-3 cancellations', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', status: 'CANCELLED' }),
        createReservation({ id: 'r2', status: 'CANCELLED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.cancelledReservations.status).toBe('green');
    });

    it('should return yellow status for 4-10 cancellations', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 5 }, (_, i) =>
        createReservation({ id: `c-${i}`, status: 'CANCELLED' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.cancelledReservations.status).toBe('yellow');
    });

    it('should return red status for >10 cancellations', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 12 }, (_, i) =>
        createReservation({ id: `c-${i}`, status: 'CANCELLED' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.cancelledReservations.status).toBe('red');
    });
  });

  describe('Pending Confirmations', () => {
    it('should count pending reservations', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', status: 'PENDING' }),
        createReservation({ id: 'r2', status: 'PENDING' }),
        createReservation({ id: 'r3', status: 'CONFIRMED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.pendingConfirmations.value).toBe(2);
    });

    it('should return green status for 0-5 pending', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 5 }, (_, i) =>
        createReservation({ id: `p-${i}`, status: 'PENDING' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.pendingConfirmations.status).toBe('green');
    });

    it('should return yellow status for 6-15 pending', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 10 }, (_, i) =>
        createReservation({ id: `p-${i}`, status: 'PENDING' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.pendingConfirmations.status).toBe('yellow');
    });

    it('should return red status for >15 pending', () => {
      const tables = [createTable()];
      const reservations = Array.from({ length: 20 }, (_, i) =>
        createReservation({ id: `p-${i}`, status: 'PENDING' })
      );

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.pendingConfirmations.status).toBe('red');
    });
  });

  describe('Average Party Size', () => {
    it('should return 0 with no active reservations', () => {
      const tables = [createTable()];
      const reservations = [createReservation({ status: 'CANCELLED' })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.value).toBe(0);
    });

    it('should calculate correct average party size', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', partySize: 2 }),
        createReservation({ id: 'r2', partySize: 4 }),
        createReservation({ id: 'r3', partySize: 6 }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.value).toBe(4);
      expect(result.averagePartySize.formatted).toBe('4.0');
    });

    it('should exclude cancelled from average', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', partySize: 2 }),
        createReservation({ id: 'r2', partySize: 4 }),
        createReservation({ id: 'r3', partySize: 100, status: 'CANCELLED' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.value).toBe(3);
    });

    it('should return green status for avg >= 4.0', () => {
      const tables = [createTable()];
      const reservations = [createReservation({ partySize: 5 })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.status).toBe('green');
    });

    it('should return yellow status for avg 2.5-3.9', () => {
      const tables = [createTable()];
      const reservations = [createReservation({ partySize: 3 })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.status).toBe('yellow');
    });

    it('should return red status for avg < 2.5', () => {
      const tables = [createTable()];
      const reservations = [createReservation({ partySize: 2 })];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.averagePartySize.status).toBe('red');
    });
  });

  describe('Seating Efficiency', () => {
    it('should return default 30 min with no gaps to calculate', () => {
      const tables = [createTable()];
      const reservations = [createReservation()];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.seatingEfficiency.value).toBe(30);
    });

    it('should calculate average gap between consecutive reservations on same table', () => {
      const tables = [createTable({ id: 'table-1' })];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-1',
          startTime: '2024-01-15T13:30:00', // 30 min gap
          endTime: '2024-01-15T14:30:00',
        }),
        createReservation({
          id: 'r3',
          tableId: 'table-1',
          startTime: '2024-01-15T14:45:00', // 15 min gap
          endTime: '2024-01-15T15:45:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // Average of 30 and 15 = 22.5 min
      expect(result.seatingEfficiency.value).toBe(22.5);
    });

    it('should only consider gaps on the same table', () => {
      const tables = [
        createTable({ id: 'table-1' }),
        createTable({ id: 'table-2' }),
      ];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-2', // Different table
          startTime: '2024-01-15T13:30:00',
          endTime: '2024-01-15T14:30:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // No gaps on same table, should return default
      expect(result.seatingEfficiency.value).toBe(30);
    });

    it('should return green status for 15-30 min gap', () => {
      const tables = [createTable({ id: 'table-1' })];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-1',
          startTime: '2024-01-15T13:20:00', // 20 min gap
          endTime: '2024-01-15T14:20:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.seatingEfficiency.status).toBe('green');
    });

    it('should return yellow status for 30-45 min gap', () => {
      const tables = [createTable({ id: 'table-1' })];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-1',
          startTime: '2024-01-15T13:40:00', // 40 min gap
          endTime: '2024-01-15T14:40:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.seatingEfficiency.status).toBe('yellow');
    });

    it('should return red status for >45 min gap', () => {
      const tables = [createTable({ id: 'table-1' })];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-1',
          startTime: '2024-01-15T14:00:00', // 60 min gap
          endTime: '2024-01-15T15:00:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.seatingEfficiency.status).toBe('red');
    });

    it('should return red status for <15 min gap', () => {
      const tables = [createTable({ id: 'table-1' })];
      const reservations = [
        createReservation({
          id: 'r1',
          tableId: 'table-1',
          startTime: '2024-01-15T12:00:00',
          endTime: '2024-01-15T13:00:00',
        }),
        createReservation({
          id: 'r2',
          tableId: 'table-1',
          startTime: '2024-01-15T13:10:00', // 10 min gap
          endTime: '2024-01-15T14:10:00',
        }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      expect(result.seatingEfficiency.status).toBe('red');
    });
  });

  describe('Date Filtering', () => {
    it('should only include reservations for selected date', () => {
      const tables = [createTable()];
      const reservations = [
        createReservation({ id: 'r1', startTime: '2024-01-15T12:00:00', endTime: '2024-01-15T14:00:00' }),
        createReservation({ id: 'r2', startTime: '2024-01-16T12:00:00', endTime: '2024-01-16T14:00:00' }),
        createReservation({ id: 'r3', startTime: '2024-01-14T12:00:00', endTime: '2024-01-14T14:00:00' }),
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // Only 1 reservation on selected date (2024-01-15)
      expect(result.averagePartySize.value).toBe(4); // Single reservation's party size
    });
  });

  describe('Multiple Tables', () => {
    it('should sum capacity from all tables', () => {
      const tables = [
        createTable({ id: 't1', capacity: { min: 2, max: 4 } }),
        createTable({ id: 't2', capacity: { min: 2, max: 6 } }),
      ];
      // Total capacity = 10 seats
      // 10 * 13h * 60min = 7800 seat-minutes available
      const reservations = [
        createReservation({ partySize: 4, durationMinutes: 120 }), // 480 seat-min
      ];

      const result = calculateKPIs(reservations, tables, selectedDate);
      // 480 / 7800 = 6.15%
      expect(result.capacityUtilization.value).toBeCloseTo(6.15, 1);
    });
  });
});
