import { computeReservationCounts } from './filterCalculations';
import type { Reservation } from '@/types/models';
import { describe, it, expect } from 'vitest';

describe('computeReservationCounts', () => {
  const tables = [
    { id: 'table-1', sectorId: 'sector-1' },
    { id: 'table-2', sectorId: 'sector-2' },
  ];

  const reservations: Reservation[] = [
    {
      id: 'r1',
      tableId: 'table-1',
      startTime: '2026-01-19T12:00:00.000',
      endTime: '2026-01-19T13:00:00.000',
      status: 'CONFIRMED',
      customer: { name: 'Alice', phone: '123' },
      partySize: 2,
      durationMinutes: 60,
      priority: 'STANDARD',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
    {
      id: 'r2',
      tableId: 'table-2',
      startTime: '2026-01-19T13:00:00.000',
      endTime: '2026-01-19T14:30:00.000',
      status: 'CANCELLED',
      customer: { name: 'Bob', phone: '456' },
      partySize: 4,
      durationMinutes: 90,
      priority: 'VIP',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
    {
      id: 'r3',
      tableId: 'table-1',
      startTime: '2026-01-20T12:00:00.000',
      endTime: '2026-01-20T13:00:00.000',
      status: 'CONFIRMED',
      customer: { name: 'Charlie', phone: '789' },
      partySize: 2,
      durationMinutes: 60,
      priority: 'STANDARD',
      createdAt: '2026-01-10T10:00:00.000',
      updatedAt: '2026-01-10T10:00:00.000',
    },
  ];

  const selectedDate = new Date(2026, 0, 19);

  it('counts total and filtered reservations for the selected day', () => {
    const result = computeReservationCounts(reservations, selectedDate, [], null, '', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 2 });
  });

  it('filters by sector', () => {
    const result = computeReservationCounts(reservations, selectedDate, ['sector-1'], null, '', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 1 });
  });

  it('filters by status', () => {
    const result = computeReservationCounts(reservations, selectedDate, [], 'CANCELLED', '', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 1 });
  });

  it('filters by search query (name)', () => {
    const result = computeReservationCounts(reservations, selectedDate, [], null, 'alice', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 1 });
  });

  it('filters by search query (phone)', () => {
    const result = computeReservationCounts(reservations, selectedDate, [], null, '456', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 1 });
  });

  it('applies all filters together', () => {
    const result = computeReservationCounts(reservations, selectedDate, ['sector-2'], 'CANCELLED', 'bob', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 1 });
  });

  it('returns zero filteredCount if no match', () => {
    const result = computeReservationCounts(reservations, selectedDate, ['sector-1'], 'CANCELLED', '', tables);
    expect(result).toEqual({ totalCount: 2, filteredCount: 0 });
  });
});
