import { describe, it, expect } from 'vitest';
import { getDateReservations, hasTimeConflict, isTableCapacityValid } from './reservationCalculations';
import type { Reservation } from '@/types/models';

describe('reservationCalculations utils', () => {
  const reservations: Reservation[] = [
    {
      id: 'r1',
      tableId: 't1',
      customer: { name: 'Alice', phone: '123' },
      partySize: 2,
      startTime: '2026-01-19T12:00:00.000',
      endTime: '2026-01-19T13:00:00.000',
      durationMinutes: 60,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
    {
      id: 'r2',
      tableId: 't1',
      customer: { name: 'Bob', phone: '456' },
      partySize: 4,
      startTime: '2026-01-19T14:00:00.000',
      endTime: '2026-01-19T15:00:00.000',
      durationMinutes: 60,
      status: 'CONFIRMED',
      priority: 'VIP',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
    {
      id: 'r3',
      tableId: 't2',
      customer: { name: 'Charlie', phone: '789' },
      partySize: 2,
      startTime: '2026-01-20T12:00:00.000',
      endTime: '2026-01-20T13:00:00.000',
      durationMinutes: 60,
      status: 'CANCELLED',
      priority: 'STANDARD',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
  ];

  it('getDateReservations returns only non-cancelled reservations for the selected date', () => {
    const selectedDate = new Date(2026, 0, 19);
    const result = getDateReservations(reservations, selectedDate);
    expect(result.length).toBe(2);
    expect(result.every(r => r.status !== 'CANCELLED')).toBe(true);
  });

  it('getDateReservations excludes a reservation by id', () => {
    const selectedDate = new Date(2026, 0, 19);
    const result = getDateReservations(reservations, selectedDate, 'r1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('r2');
  });

  it('hasTimeConflict detects overlapping reservations', () => {
    const selectedDate = new Date(2026, 0, 19);
    const dateRes = getDateReservations(reservations, selectedDate);
    // Overlaps with r1 (12:00-13:00)
    const startTime = new Date(2026, 0, 19, 12, 30);
    expect(hasTimeConflict('t1', startTime, 30, dateRes)).toBe(true);
    // No overlap with r2 (14:00-15:00)
    const startTime2 = new Date(2026, 0, 19, 13, 30);
    expect(hasTimeConflict('t1', startTime2, 20, dateRes)).toBe(false);
  });

  it('isTableCapacityValid returns true for valid party size', () => {
    expect(isTableCapacityValid({ min: 2, max: 4 }, 3)).toBe(true);
  });

  it('isTableCapacityValid returns false for invalid party size', () => {
    expect(isTableCapacityValid({ min: 2, max: 4 }, 1)).toBe(false);
    expect(isTableCapacityValid({ min: 2, max: 4 }, 5)).toBe(false);
  });

  it('isTableCapacityValid returns true if tableCapacity is undefined', () => {
    expect(isTableCapacityValid(undefined, 3)).toBe(true);
  });
});
