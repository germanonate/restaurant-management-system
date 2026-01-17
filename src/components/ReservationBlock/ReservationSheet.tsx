import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, setHours, setMinutes } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  MapPin,
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

// Generate time options from START_HOUR to END_HOUR in 15-min increments
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
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

  // Group tables by sector for the dropdown
  const tablesBySector = useMemo(() => {
    return sectors.map((sector) => ({
      sector,
      tables: tables.filter((t) => t.sectorId === sector.id),
    }));
  }, [tables, sectors]);

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
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Date and Time - only show in create mode or if editable */}
              {mode !== 'view' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
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

                  <div className="space-y-2">
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
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Table selection - only show in create mode without preset table */}
              {mode === 'create' && !initialData?.tableId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[rgb(255,147,67)]" />
                    Table *
                  </Label>
                  <Select
                    value={selectedTableId ?? ''}
                    onValueChange={(v) => setSelectedTableId(v as UUID)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tablesBySector.map(({ sector, tables: sectorTables }) => (
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
                              {t.name} ({t.capacity.min}-{t.capacity.max} guests)
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show selected table info if preset */}
              {(mode === 'edit' || (mode === 'create' && initialData?.tableId)) && table && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm">
                  <MapPin className="h-4 w-4 text-[rgb(255,147,67)]" />
                  <span className="font-medium">{table.name}</span>
                  <span className="text-muted-foreground">
                    ({table.capacity.min}-{table.capacity.max} guests)
                  </span>
                </div>
              )}

              {/* Customer name */}
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

              {/* Phone */}
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

              {/* Email */}
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

              {/* Party size and duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partySize">Party Size *</Label>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                    disabled={mode === 'view'}
                  />
                  {(table || (selectedTableId && getTableById(selectedTableId))) && (
                    <p className="text-xs text-muted-foreground">
                      Table capacity: {(table || getTableById(selectedTableId!))?.capacity.min}-
                      {(table || getTableById(selectedTableId!))?.capacity.max}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={durationMinutes.toString()}
                    onValueChange={(v) => setDurationMinutes(parseInt(v))}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger id="duration">
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
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
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
