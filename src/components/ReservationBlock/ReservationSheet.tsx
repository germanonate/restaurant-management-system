import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, setHours, setMinutes, isSameDay, addMinutes } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  MapPin,
  Timer,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReservationStore } from '@/stores/reservationStore';
import type {
  Reservation,
  ReservationStatus,
  Priority,
  UUID,
} from '@/types/models';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/types/models';
import { cn } from '@/lib/utils';
import { START_HOUR, END_HOUR, SLOT_MINUTES } from '@/utils/timeCalculations';

interface ReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  reservation?: Reservation;
  initialData?: {
    tableId?: UUID;
    startTime?: string;
    durationMinutes?: number;
  };
  onSubmit?: (data: {
    customer: { name: string; phone: string; email?: string; notes?: string };
    partySize: number;
    durationMinutes: number;
    status: ReservationStatus;
    priority: Priority;
    notes?: string;
    tableId?: UUID;
    date?: Date;
    startTime?: string;
  }) => { success: boolean; error?: string } | void;
}

// Duration options: 15-minute increments, min 30 min, max 6 hours (360 min)
const DURATION_OPTIONS = [
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

interface TimeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Generate time options from START_HOUR to END_HOUR in 15-min increments
const generateTimeOptions = (): TimeOption[] => {
  const options: TimeOption[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ value: timeValue, label: timeValue });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const MIN_DURATION = 30;
const MAX_DURATION = 360;

export const ReservationSheet = memo(function ReservationSheet({
  open,
  onOpenChange,
  mode,
  reservation,
  initialData,
  onSubmit,
}: ReservationSheetProps) {
  const tables = useReservationStore((state) => state.tables);
  const sectors = useReservationStore((state) => state.sectors);
  const reservations = useReservationStore((state) => state.reservations);
  const selectedStoreDate = useReservationStore((state) => state.selectedDate);
  const getTableById = useReservationStore((state) => state.getTableById);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [status, setStatus] = useState<ReservationStatus>('CONFIRMED');
  const [priority, setPriority] = useState<Priority>('STANDARD');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // New fields
  const [selectedDate, setSelectedDate] = useState<Date>(selectedStoreDate);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [selectedTableId, setSelectedTableId] = useState<UUID | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const tableId = reservation?.tableId ?? initialData?.tableId ?? selectedTableId;
  const table = tableId ? getTableById(tableId) : undefined;

  // Get reservations for the selected date (excluding current reservation if editing)
  const dateReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (r.status === 'CANCELLED') return false;
      if (mode === 'edit' && reservation && r.id === reservation.id) return false;
      return isSameDay(parseISO(r.startTime), selectedDate);
    });
  }, [reservations, selectedDate, mode, reservation]);

  // Check if a time slot conflicts with existing reservations for a table
  const hasConflict = useCallback(
    (tableId: UUID, startTime: Date, duration: number) => {
      const endTime = addMinutes(startTime, duration);
      return dateReservations.some((r) => {
        if (r.tableId !== tableId) return false;
        const rStart = parseISO(r.startTime);
        const rEnd = parseISO(r.endTime);
        // Check for overlap
        return startTime < rEnd && endTime > rStart;
      });
    },
    [dateReservations]
  );

  // Filter tables by party size capacity
  const availableTablesBySector = useMemo(() => {
    return sectors.map((sector) => ({
      sector,
      tables: tables
        .filter((t) => t.sectorId === sector.id)
        .filter((t) => partySize >= t.capacity.min && partySize <= t.capacity.max),
    })).filter(({ tables: sectorTables }) => sectorTables.length > 0);
  }, [tables, sectors, partySize]);

  // Filter time options to only show available times for the selected table
  const availableTimeOptions = useMemo(() => {
    if (!selectedTableId) return TIME_OPTIONS;

    return TIME_OPTIONS.map((opt) => {
      const [hours, minutes] = opt.value.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const isConflict = hasConflict(selectedTableId, startTime, durationMinutes);
      return { ...opt, disabled: isConflict };
    });
  }, [selectedTableId, selectedDate, durationMinutes, hasConflict]);

  // Check if selected table has capacity for party size
  const selectedTableValid = useMemo(() => {
    if (!selectedTableId) return true;
    const t = getTableById(selectedTableId);
    if (!t) return true;
    return partySize >= t.capacity.min && partySize <= t.capacity.max;
  }, [selectedTableId, partySize, getTableById]);

  // Real-time validation: check for conflicts when all booking fields are filled
  const bookingValidation = useMemo(() => {
    // Only validate if we have all required booking fields
    const effectiveTableId = selectedTableId ?? initialData?.tableId;
    if (!effectiveTableId || !selectedTime) {
      return { isValid: true, error: null };
    }

    // Check party size vs table capacity
    const currentTable = getTableById(effectiveTableId);
    if (currentTable && (partySize < currentTable.capacity.min || partySize > currentTable.capacity.max)) {
      return {
        isValid: false,
        error: `Party size must be between ${currentTable.capacity.min} and ${currentTable.capacity.max} for this table`,
      };
    }

    // Check for time conflicts
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    if (hasConflict(effectiveTableId, startTime, durationMinutes)) {
      return {
        isValid: false,
        error: 'This time slot conflicts with an existing reservation',
      };
    }

    return { isValid: true, error: null };
  }, [selectedTableId, initialData?.tableId, selectedTime, selectedDate, durationMinutes, partySize, getTableById, hasConflict]);

  // Reset form when opening - intentional setState in effect for modal form reset
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && reservation) {
      setName(reservation.customer.name);
      setPhone(reservation.customer.phone);
      setEmail(reservation.customer.email ?? '');
      setPartySize(reservation.partySize);
      setDurationMinutes(reservation.durationMinutes);
      setStatus(reservation.status);
      setPriority(reservation.priority);
      setNotes(reservation.notes ?? '');
      const startDate = parseISO(reservation.startTime);
      setSelectedDate(startDate);
      setSelectedTime(format(startDate, 'HH:mm'));
      setSelectedTableId(reservation.tableId);
    } else if (mode === 'create') {
      setName('');
      setPhone('');
      setEmail('');
      setPartySize(2);
      setDurationMinutes(initialData?.durationMinutes ?? 90);
      setStatus('CONFIRMED');
      setPriority('STANDARD');
      setNotes('');
      if (initialData?.startTime) {
        const startDate = parseISO(initialData.startTime);
        setSelectedDate(startDate);
        setSelectedTime(format(startDate, 'HH:mm'));
      } else {
        setSelectedDate(selectedStoreDate);
        setSelectedTime('12:00');
      }
      setSelectedTableId(initialData?.tableId ?? null);
    }
    setError(null);
  }, [open, mode, reservation, initialData, selectedStoreDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError('Customer name is required');
        return;
      }

      if (!phone.trim()) {
        setError('Phone number is required');
        return;
      }

      if (!selectedTableId && mode === 'create' && !initialData?.tableId) {
        setError('Please select a table');
        return;
      }

      const currentTable = selectedTableId ? getTableById(selectedTableId) : table;
      if (currentTable && (partySize < currentTable.capacity.min || partySize > currentTable.capacity.max)) {
        setError(
          `Party size must be between ${currentTable.capacity.min} and ${currentTable.capacity.max} for this table`
        );
        return;
      }

      if (durationMinutes < MIN_DURATION || durationMinutes > MAX_DURATION) {
        setError(`Duration must be between 30 minutes and 6 hours`);
        return;
      }

      // Build start time from date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);

      if (onSubmit) {
        const result = onSubmit({
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
          },
          partySize,
          durationMinutes,
          status,
          priority,
          notes: notes.trim() || undefined,
          tableId: selectedTableId ?? initialData?.tableId,
          date: selectedDate,
          startTime: startDateTime.toISOString(),
        });

        if (result && !result.success && result.error) {
          setError(result.error);
        }
      }
    },
    [name, phone, email, partySize, durationMinutes, status, priority, notes, table, onSubmit, selectedDate, selectedTime, selectedTableId, initialData, mode, getTableById]
  );

  const title =
    mode === 'create'
      ? 'New Reservation'
      : mode === 'edit'
        ? 'Edit Reservation'
        : 'Reservation Details';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              {/* Error message - show submit error or real-time validation error */}
              {(error || bookingValidation.error) && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error || bookingValidation.error}
                </div>
              )}

              {/* Row 1: Date and Party Size */}
              {mode !== 'view' && (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-[rgb(255,147,67)]" />
                      Date *
                    </Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(selectedDate, 'PP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                              setDatePickerOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="partySize" className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[rgb(255,147,67)]" />
                      Party Size *
                    </Label>
                    <Input
                      id="partySize"
                      type="number"
                      min={1}
                      max={20}
                      value={partySize}
                      onChange={(e) => {
                        setPartySize(parseInt(e.target.value) || 1);
                        // Reset table if it no longer fits the party size
                        if (selectedTableId) {
                          const t = getTableById(selectedTableId);
                          const newSize = parseInt(e.target.value) || 1;
                          if (t && (newSize < t.capacity.min || newSize > t.capacity.max)) {
                            setSelectedTableId(null);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Row 2: Duration, Table, and Time */}
              {mode !== 'view' && (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-[rgb(255,147,67)]" />
                      Duration
                    </Label>
                    <Select
                      value={durationMinutes.toString()}
                      onValueChange={(v) => setDurationMinutes(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Table selection - only show in create mode without preset table */}
                  {mode === 'create' && !initialData?.tableId ? (
                    <div className="flex-1 space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[rgb(255,147,67)]" />
                        Table *
                      </Label>
                      <Select
                        value={selectedTableId ?? ''}
                        onValueChange={(v) => setSelectedTableId(v as UUID)}
                      >
                        <SelectTrigger className={cn(!selectedTableValid && 'border-red-500')}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTablesBySector.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                              No tables fit {partySize} guests
                            </div>
                          ) : (
                            availableTablesBySector.map(({ sector, tables: sectorTables }) => (
                              <div key={sector.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: sector.color }}
                                  />
                                  {sector.name}
                                </div>
                                {sectorTables.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    /* Show selected table info if preset or editing */
                    <div className="flex-1 space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[rgb(255,147,67)]" />
                        Table
                      </Label>
                      <div className="flex items-center h-9 px-3 bg-muted/50 rounded-md text-sm">
                        <span className="font-medium truncate">{table?.name}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[rgb(255,147,67)]" />
                      Time *
                    </Label>
                    <Select
                      value={selectedTime}
                      onValueChange={setSelectedTime}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableTimeOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                            className={cn(opt.disabled && 'text-muted-foreground line-through')}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Customer name - full row */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[rgb(255,147,67)]" />
                  Customer Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                  disabled={mode === 'view'}
                />
              </div>

              {/* Phone - full row */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[rgb(255,147,67)]" />
                  Phone *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  required
                  disabled={mode === 'view'}
                />
              </div>

              {/* Email - full row */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[rgb(255,147,67)]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={mode === 'view'}
                />
              </div>

              {/* Status and Priority - same row */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ReservationStatus)}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as Priority)}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[rgb(255,147,67)]" />
                  Notes
                </Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requests, allergies, etc."
                  className={cn(
                    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </div>

          {/* Fixed bottom actions */}
          {mode !== 'view' && (
            <div className="shrink-0 border-t bg-background px-6 py-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {mode === 'create' ? 'Create Reservation' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
});
