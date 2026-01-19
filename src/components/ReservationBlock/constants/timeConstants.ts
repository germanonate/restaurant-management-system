import { setHours, setMinutes } from 'date-fns';

export interface TimeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Generate time options from a start hour to end hour in 15-minute increments
 * Used for time slot selection in reservation forms
 */
export function generateReservationTimeOptions(
  startHour: number,
  endHour: number,
  slotMinutes: number
): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ value: timeValue, label: timeValue });
    }
  }
  return options;
}

/**
 * Mark disabled time slots based on conflicts
 */
export function markDisabledTimeSlots(
  timeOptions: TimeOption[],
  conflictChecker: (time: Date) => boolean,
  selectedDate: Date
): TimeOption[] {
  return timeOptions.map((opt) => {
    const [hours, minutes] = opt.value.split(':').map(Number);
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const isConflict = conflictChecker(startTime);
    return { ...opt, disabled: isConflict };
  });
}
