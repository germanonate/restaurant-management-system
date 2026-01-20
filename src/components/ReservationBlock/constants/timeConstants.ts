// ...existing code...

export interface TimeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Generate time options from a start hour to end hour in 15-minute increments
 * Used for time slot selection in reservation forms
 */
// Removed functions generateReservationTimeOptions and markDisabledTimeSlots
