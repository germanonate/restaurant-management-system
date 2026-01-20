import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReservationSheet } from './ReservationSheet';
import { useReservationStore } from '@/stores/reservationStore';
import type { Reservation, Table, Sector } from '@/types/models';

vi.mock('@/stores/reservationStore');

const mockTables: Table[] = [
  { id: 'table-1', name: 'Table 1', sectorId: 'sector-1', capacity: { min: 2, max: 4 }, sortOrder: 0 },
  { id: 'table-2', name: 'Table 2', sectorId: 'sector-1', capacity: { min: 4, max: 8 }, sortOrder: 1 },
];

const mockSectors: Sector[] = [
  { id: 'sector-1', name: 'Main Hall', color: '#ff0000', sortOrder: 0 },
];

const mockReservation: Reservation = {
  id: 'res-1',
  tableId: 'table-1',
  customer: { name: 'John Doe', phone: '123-456-7890', email: 'john@example.com' },
  partySize: 4,
  startTime: '2024-01-15T18:00:00',
  endTime: '2024-01-15T20:00:00',
  durationMinutes: 120,
  status: 'CONFIRMED',
  priority: 'VIP',
  notes: 'Window seat preferred',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
};

const mockSelectedDate = new Date('2024-01-15T12:00:00');

describe('ReservationSheet', () => {
  let mockOnOpenChange: (open: boolean) => void;
  let mockOnSubmit: (
    data: {
      customer: { name: string; phone: string; email?: string; notes?: string };
      partySize: number;
      durationMinutes: number;
      status: import('@/types/models').ReservationStatus;
      priority: import('@/types/models').Priority;
      tableId?: string;
      notes?: string;
      startTime?: string;
    }
  ) => void | { success: boolean; error?: string };

  beforeEach(() => {
    mockOnOpenChange = vi.fn() as (open: boolean) => void;
    mockOnSubmit = vi.fn((() => ({ success: true })) as (
      data: {
        customer: { name: string; phone: string; email?: string; notes?: string };
        partySize: number;
        durationMinutes: number;
        status: import('@/types/models').ReservationStatus;
        priority: import('@/types/models').Priority;
        tableId?: string;
        notes?: string;
        startTime?: string;
      }
    ) => void | { success: boolean; error?: string });

    vi.mocked(useReservationStore).mockImplementation((selector) => {
      const state = {
        tables: mockTables,
        sectors: mockSectors,
        reservations: [],
        selectedDate: mockSelectedDate,
        getTableById: (id: string) => mockTables.find((t) => t.id === id),
      };
      return selector(state as never);
    });
  });

  describe('Rendering', () => {
    it('should render "New Reservation" title in create mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText('New Reservation')).toBeInTheDocument();
    });

    it('should render "Edit Reservation" title in edit mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText('Edit Reservation')).toBeInTheDocument();
    });

    it('should render "Reservation Details" title in view mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="view"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText('Reservation Details')).toBeInTheDocument();
    });

    it('should show "Create Reservation" button in create mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByRole('button', { name: 'Create Reservation' })).toBeInTheDocument();
    });

    it('should show "Save Changes" button in edit mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    });

    it('should not show action buttons in view mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="view"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create Reservation' })).not.toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <ReservationSheet
          open={false}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.queryByText('New Reservation')).not.toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('should have empty inputs in create mode', () => {
      render(
        <ReservationSheet
          open={true}
            onOpenChange={mockOnOpenChange as (open: boolean) => void}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText('Enter customer name')).toHaveValue('');
      expect(screen.getByPlaceholderText('+1 234 567 8900')).toHaveValue('');
    });

    it('should populate fields in edit mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123-456-7890')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('should show preset table name', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          initialData={{ tableId: 'table-1' }}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Table 1')).toBeInTheDocument();
    });
  });
  
  describe('Form Validation', () => {
    it('should not submit without required fields', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          initialData={{ tableId: 'table-1' }}
          onSubmit={mockOnSubmit}
        />
      );

      // Submit without filling required fields
      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require table selection in create mode', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Enter customer name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('+1 234 567 8900'), {
        target: { value: '123456789' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      expect(screen.getByText('Please select a table')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate party size against table capacity', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          initialData={{ tableId: 'table-1' }} // capacity 2-4
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Enter customer name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('+1 234 567 8900'), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByRole('spinbutton'), {
        target: { value: '10' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      expect(screen.getByText(/Party size must be between/)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data', () => {
      render(
        <ReservationSheet
          open={true}
            onOpenChange={mockOnOpenChange as (open: boolean) => void}
          mode="create"
          initialData={{ tableId: 'table-1', startTime: '2024-01-15T18:00:00' }}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Enter customer name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('+1 234 567 8900'), {
        target: { value: '123456789' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            name: 'Test User',
            phone: '123456789',
          }),
          tableId: 'table-1',
        })
      );
    });

    it('should display error returned from onSubmit', () => {
      (mockOnSubmit as ReturnType<typeof vi.fn>).mockImplementation(() => ({ success: false, error: 'Conflict detected' }));

      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          initialData={{ tableId: 'table-1' }}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Enter customer name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('+1 234 567 8900'), {
        target: { value: '123456789' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      expect(screen.getByText('Conflict detected')).toBeInTheDocument();
    });

    it('should include optional email and notes', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          initialData={{ tableId: 'table-1' }}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Enter customer name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('+1 234 567 8900'), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByPlaceholderText('email@example.com'), {
        target: { value: 'test@test.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Special requests, allergies, etc.'), {
        target: { value: 'No nuts' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Reservation' }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            email: 'test@test.com',
          }),
          notes: 'No nuts',
        })
      );
    });
  });

  describe('Cancel Button', () => {
    it('should close sheet when clicked', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Edit Mode', () => {
    it('should submit edited data', () => {
      render(
        <ReservationSheet
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          reservation={mockReservation}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            name: 'Jane Smith',
          }),
        })
      );
    });
  });
});
