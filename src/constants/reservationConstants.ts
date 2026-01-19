// Duration options: 15-minute increments, min 30 min, max 6 hours (360 min)
// Used globally for reservation duration selection
export const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 75, label: '1h 15min' },
  { value: 90, label: '1h 30min' },
  { value: 105, label: '1h 45min' },
  { value: 120, label: '2 hours' },
  { value: 135, label: '2h 15min' },
  { value: 150, label: '2h 30min' },
  { value: 165, label: '2h 45min' },
  { value: 180, label: '3 hours' },
  { value: 195, label: '3h 15min' },
  { value: 210, label: '3h 30min' },
  { value: 225, label: '3h 45min' },
  { value: 240, label: '4 hours' },
  { value: 255, label: '4h 15min' },
  { value: 270, label: '4h 30min' },
  { value: 285, label: '4h 45min' },
  { value: 300, label: '5 hours' },
  { value: 315, label: '5h 15min' },
  { value: 330, label: '5h 30min' },
  { value: 345, label: '5h 45min' },
  { value: 360, label: '6 hours' },
];

// Min and max duration constraints in minutes
export const MIN_DURATION = 30;
export const MAX_DURATION = 360;
