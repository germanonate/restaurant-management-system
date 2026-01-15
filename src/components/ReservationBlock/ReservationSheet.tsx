import { memo, useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Users, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface ReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  reservation?: Reservation;
  initialData?: {
    tableId: UUID;
    startTime: string;
    durationMinutes: number;
  };
  onSubmit?: (data: {
    customer: { name: string; phone: string; email?: string; notes?: string };
    partySize: number;
    durationMinutes: number;
    status: ReservationStatus;
    priority: Priority;
    notes?: string;
    tableId?: UUID;
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

  const tableId = reservation?.tableId ?? initialData?.tableId;
  const table = tableId ? getTableById(tableId) : undefined;
  const startTime = reservation?.startTime ?? initialData?.startTime;

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && reservation) {
        setName(reservation.customer.name);
        setPhone(reservation.customer.phone);
        setEmail(reservation.customer.email ?? '');
        setPartySize(reservation.partySize);
        setDurationMinutes(reservation.durationMinutes);
        setStatus(reservation.status);
        setPriority(reservation.priority);
        setNotes(reservation.notes ?? '');
      } else if (mode === 'create' && initialData) {
        setName('');
        setPhone('');
        setEmail('');
        setPartySize(2);
        setDurationMinutes(initialData.durationMinutes);
        setStatus('CONFIRMED');
        setPriority('STANDARD');
        setNotes('');
      }
      setError(null);
    }
  }, [open, mode, reservation, initialData]);

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

      if (table && (partySize < table.capacity.min || partySize > table.capacity.max)) {
        setError(
          `Party size must be between ${table.capacity.min} and ${table.capacity.max} for this table`
        );
        return;
      }

      if (durationMinutes < MIN_DURATION || durationMinutes > MAX_DURATION) {
        setError(`Duration must be between 30 minutes and 6 hours`);
        return;
      }

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
        });

        if (result && !result.success && result.error) {
          setError(result.error);
        }
      }
    },
    [name, phone, email, partySize, durationMinutes, status, priority, notes, table, onSubmit]
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
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {table && startTime && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {table.name} • {format(parseISO(startTime), 'PPP p')}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
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
              {table && (
                <p className="text-xs text-muted-foreground">
                  Table capacity: {table.capacity.min}-{table.capacity.max}
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

          {/* Actions */}
          {mode !== 'view' && (
            <div className="flex gap-3 pt-4">
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
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
});
