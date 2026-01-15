export type UUID = string;
export type ISODateTime = string;
export type Minutes = number;
export type SlotIndex = number;

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'FINISHED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type Priority = 'STANDARD' | 'VIP' | 'LARGE_GROUP';

export interface Sector {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Table {
  id: UUID;
  sectorId: UUID;
  name: string;
  capacity: {
    min: number;
    max: number;
  };
  sortOrder: number;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Reservation {
  id: UUID;
  tableId: UUID;
  customer: Customer;
  partySize: number;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMinutes: Minutes;
  status: ReservationStatus;
  priority: Priority;
  notes?: string;
  source?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ServiceHours {
  start: string;
  end: string;
}

export interface Restaurant {
  id: UUID;
  name: string;
  timezone: string;
  serviceHours: ServiceHours[];
}

export interface TimelineConfig {
  date: string;
  startHour: number;
  endHour: number;
  slotMinutes: Minutes;
  viewMode: 'day' | '3-day' | 'week';
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingReservationIds: UUID[];
  reason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

export interface DragState {
  isDragging: boolean;
  dragType: 'create' | 'move' | 'resize-start' | 'resize-end' | null;
  startSlot: SlotIndex | null;
  endSlot: SlotIndex | null;
  tableId: UUID | null;
  reservationId: UUID | null;
}

export interface FilterState {
  sectorIds: UUID[];
  status: ReservationStatus | null;
  searchQuery: string;
}

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: '#FCD34D',
  CONFIRMED: '#3B82F6',
  SEATED: '#10B981',
  FINISHED: '#9CA3AF',
  NO_SHOW: '#EF4444',
  CANCELLED: '#6B7280',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  STANDARD: 'Standard',
  VIP: 'VIP',
  LARGE_GROUP: 'Large Group',
};

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SEATED: 'Seated',
  FINISHED: 'Finished',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
};
