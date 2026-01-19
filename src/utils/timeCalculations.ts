import { format, parseISO, differenceInMinutes, addMinutes, setHours, setMinutes, startOfDay, isSameDay } from 'date-fns';
import type { Minutes, SlotIndex, ISODateTime } from '@/types/models';

export const SLOT_MINUTES = 15;
export const START_HOUR = 11;
export const END_HOUR = 24; // Midnight represented as 24 for calculations
export const BASE_SLOT_WIDTH = 60;
export const BASE_ROW_HEIGHT = 60;
// Keep ROW_HEIGHT for backwards compatibility, but prefer getRowHeight(zoomLevel)
export const ROW_HEIGHT = 60;

// Get row height scaled by zoom level
export function getRowHeight(zoomLevel: number): number {
  return (BASE_ROW_HEIGHT * zoomLevel) / 100;
}

export function getOperatingMinutes(): Minutes {
  return (END_HOUR - START_HOUR) * 60;
}

export function getTotalSlots(): number {
  return getOperatingMinutes() / SLOT_MINUTES;
}

export function timeToSlotIndex(time: Date, referenceDate: Date): SlotIndex {
  const dayStart = startOfDay(referenceDate);
  const operatingStart = setMinutes(setHours(dayStart, START_HOUR), 0);
  const minutes = differenceInMinutes(time, operatingStart);
  return Math.floor(minutes / SLOT_MINUTES);
}

export function slotIndexToTime(slotIndex: SlotIndex, referenceDate: Date): Date {
  const dayStart = startOfDay(referenceDate);
  const operatingStart = setMinutes(setHours(dayStart, START_HOUR), 0);
  return addMinutes(operatingStart, slotIndex * SLOT_MINUTES);
}

export function durationToSlots(durationMinutes: Minutes): number {
  return Math.ceil(durationMinutes / SLOT_MINUTES);
}

export function slotsToDuration(slots: number): Minutes {
  return slots * SLOT_MINUTES;
}

export function formatTimeSlot(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatTimeRange(start: ISODateTime, end: ISODateTime): string {
  return `${format(parseISO(start), 'HH:mm')} - ${format(parseISO(end), 'HH:mm')}`;
}

export function snapToSlot(position: number, slotWidth: number): number {
  return Math.round(position / slotWidth) * slotWidth;
}

export function snapToSlotIndex(position: number, slotWidth: number): SlotIndex {
  return Math.round(position / slotWidth);
}

export function getSlotPosition(slotIndex: SlotIndex, slotWidth: number): number {
  return slotIndex * slotWidth;
}

export function getReservationWidth(durationMinutes: Minutes, slotWidth: number): number {
  return durationToSlots(durationMinutes) * slotWidth;
}

export function getReservationPosition(
  startTime: ISODateTime,
  referenceDate: Date,
  slotWidth: number
): number {
  const time = parseISO(startTime);
  const slotIndex = timeToSlotIndex(time, referenceDate);
  return slotIndex * slotWidth;
}

export function isWithinOperatingHours(time: Date, referenceDate: Date): boolean {
  const dayStart = startOfDay(referenceDate);
  const operatingStart = setMinutes(setHours(dayStart, START_HOUR), 0);
  const operatingEnd = setMinutes(setHours(dayStart, END_HOUR === 24 ? 0 : END_HOUR), 0);

  // Handle midnight crossover
  if (END_HOUR === 24) {
    const nextDayMidnight = addMinutes(dayStart, 24 * 60);
    return time >= operatingStart && time <= nextDayMidnight;
  }

  return time >= operatingStart && time <= operatingEnd;
}

export function generateTimeSlotLabels(date: Date): string[] {
  const labels: string[] = [];
  const totalSlots = getTotalSlots();

  for (let i = 0; i <= totalSlots; i += 2) { // Every 30 minutes
    const time = slotIndexToTime(i, date);
    labels.push(formatTimeSlot(time));
  }

  return labels;
}

export function isReservationOnDate(startTime: ISODateTime, date: Date): boolean {
  const reservationDate = parseISO(startTime);
  return isSameDay(reservationDate, date);
}

export function clampSlotIndex(slotIndex: SlotIndex): SlotIndex {
  const maxSlot = getTotalSlots() - 1;
  return Math.max(0, Math.min(slotIndex, maxSlot));
}

export function getCurrentTimeSlotIndex(referenceDate: Date): SlotIndex {
  const now = new Date();
  if (!isSameDay(now, referenceDate)) {
    return -1;
  }
  return timeToSlotIndex(now, referenceDate);
}

export function getCurrentTimePosition(referenceDate: Date, slotWidth: number, showOnAnyDate = true): number | null {
  const now = new Date();

  // If not showing on any date, only show on actual today
  if (!showOnAnyDate && !isSameDay(now, referenceDate)) {
    return null;
  }

  const dayStart = startOfDay(referenceDate);
  const operatingStart = setMinutes(setHours(dayStart, START_HOUR), 0);
  const operatingEnd = addMinutes(dayStart, END_HOUR * 60);

  // Create a "simulated now" using current time of day but on the reference date
  const simulatedNow = setMinutes(setHours(dayStart, now.getHours()), now.getMinutes());

  if (simulatedNow < operatingStart || simulatedNow > operatingEnd) {
    return null;
  }

  const minutesFromStart = differenceInMinutes(simulatedNow, operatingStart);
  return (minutesFromStart / SLOT_MINUTES) * slotWidth;
}
