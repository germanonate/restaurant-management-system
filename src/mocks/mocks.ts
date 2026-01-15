import type { Restaurant, Sector, Table, Reservation } from '@/types/models';

export const mockRestaurant: Restaurant = {
  id: 'R1',
  name: 'Bistro Central',
  timezone: 'America/Argentina/Buenos_Aires',
  serviceHours: [
    { start: '12:00', end: '16:00' },
    { start: '20:00', end: '00:00' },
  ],
};

export const mockSectors: Sector[] = [
  { id: 'S1', name: 'Main Hall', color: '#3B82F6', sortOrder: 0 },
  { id: 'S2', name: 'Terrace', color: '#10B981', sortOrder: 1 },
];

export const mockTables: Table[] = [
  { id: 'T1', sectorId: 'S1', name: 'Table 1', capacity: { min: 2, max: 2 }, sortOrder: 0 },
  { id: 'T2', sectorId: 'S1', name: 'Table 2', capacity: { min: 2, max: 4 }, sortOrder: 1 },
  { id: 'T3', sectorId: 'S1', name: 'Table 3', capacity: { min: 4, max: 6 }, sortOrder: 2 },
  { id: 'T4', sectorId: 'S2', name: 'Table 4', capacity: { min: 2, max: 4 }, sortOrder: 0 },
  { id: 'T5', sectorId: 'S2', name: 'Table 5', capacity: { min: 4, max: 8 }, sortOrder: 1 },
];

export const mockReservations: Reservation[] = [
  {
    id: 'RES_001',
    tableId: 'T1',
    customer: { name: 'John Doe', phone: '+54 9 11 5555-1234', email: 'john@example.com' },
    partySize: 2,
    startTime: '2025-10-15T20:00:00-03:00',
    endTime: '2025-10-15T21:30:00-03:00',
    durationMinutes: 90,
    status: 'CONFIRMED',
    priority: 'STANDARD',
    source: 'web',
    createdAt: '2025-10-14T15:30:00-03:00',
    updatedAt: '2025-10-14T15:30:00-03:00',
  },
  {
    id: 'RES_002',
    tableId: 'T3',
    customer: { name: 'Jane Smith', phone: '+54 9 11 5555-5678', email: 'jane@example.com' },
    partySize: 6,
    startTime: '2025-10-15T20:30:00-03:00',
    endTime: '2025-10-15T22:00:00-03:00',
    durationMinutes: 90,
    status: 'SEATED',
    priority: 'VIP',
    notes: 'Birthday celebration',
    source: 'phone',
    createdAt: '2025-10-15T19:45:00-03:00',
    updatedAt: '2025-10-15T20:35:00-03:00',
  },
  {
    id: 'RES_003',
    tableId: 'T2',
    customer: { name: 'Alice Johnson', phone: '+54 9 11 5555-9999' },
    partySize: 3,
    startTime: '2025-10-15T12:30:00-03:00',
    endTime: '2025-10-15T14:00:00-03:00',
    durationMinutes: 90,
    status: 'FINISHED',
    priority: 'STANDARD',
    source: 'phone',
    createdAt: '2025-10-15T10:00:00-03:00',
    updatedAt: '2025-10-15T14:00:00-03:00',
  },
  {
    id: 'RES_004',
    tableId: 'T4',
    customer: { name: 'Bob Williams', phone: '+54 9 11 5555-8888' },
    partySize: 4,
    startTime: '2025-10-15T21:00:00-03:00',
    endTime: '2025-10-15T23:00:00-03:00',
    durationMinutes: 120,
    status: 'PENDING',
    priority: 'LARGE_GROUP',
    notes: 'Business dinner',
    source: 'web',
    createdAt: '2025-10-15T18:00:00-03:00',
    updatedAt: '2025-10-15T18:00:00-03:00',
  },
  {
    id: 'RES_005',
    tableId: 'T5',
    customer: { name: 'Carol Davis', phone: '+54 9 11 5555-7777' },
    partySize: 6,
    startTime: '2025-10-15T13:00:00-03:00',
    endTime: '2025-10-15T15:00:00-03:00',
    durationMinutes: 120,
    status: 'NO_SHOW',
    priority: 'STANDARD',
    source: 'phone',
    createdAt: '2025-10-14T20:00:00-03:00',
    updatedAt: '2025-10-15T13:30:00-03:00',
  },
];

export const SEED_DATE = '2025-10-15';
