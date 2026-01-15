import { create } from 'zustand';
import type {
  Reservation,
  Table,
  Sector,
  Restaurant,
  UUID,
  ReservationStatus,
  FilterState,
  DragState,
} from '@/types/models';
import { mockRestaurant, mockSectors, mockTables, mockReservations, SEED_DATE } from '@/mocks/mocks';
import { parse, parseISO, isSameDay } from 'date-fns';

interface ReservationStore {
  // Data
  restaurant: Restaurant;
  sectors: Sector[];
  tables: Table[];
  reservations: Reservation[];

  // UI State
  selectedDate: Date;
  filters: FilterState;
  zoomLevel: number;
  collapsedSectors: Set<UUID>;
  selectedReservationId: UUID | null;
  dragState: DragState;

  // Actions
  setSelectedDate: (date: Date) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  setZoomLevel: (level: number) => void;
  toggleSectorCollapse: (sectorId: UUID) => void;
  setSelectedReservation: (id: UUID | null) => void;
  setDragState: (state: Partial<DragState>) => void;
  resetDragState: () => void;

  // CRUD
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: UUID, updates: Partial<Reservation>) => void;
  deleteReservation: (id: UUID) => void;
  updateReservationStatus: (id: UUID, status: ReservationStatus) => void;
  duplicateReservation: (id: UUID) => Reservation | null;

  // Computed
  getFilteredReservations: () => Reservation[];
  getReservationsForTable: (tableId: UUID) => Reservation[];
  getTableById: (tableId: UUID) => Table | undefined;
  getSectorById: (sectorId: UUID) => Sector | undefined;
  getReservationById: (id: UUID) => Reservation | undefined;
}

const initialDragState: DragState = {
  isDragging: false,
  dragType: null,
  startSlot: null,
  endSlot: null,
  tableId: null,
  reservationId: null,
};

const initialFilters: FilterState = {
  sectorIds: [],
  status: null,
  searchQuery: '',
};

export const useReservationStore = create<ReservationStore>((set, get) => ({
  // Initial data
  restaurant: mockRestaurant,
  sectors: mockSectors,
  tables: mockTables,
  reservations: mockReservations,

  // Initial UI state - use parse to interpret date in local timezone
  selectedDate: parse(SEED_DATE, 'yyyy-MM-dd', new Date()),
  filters: initialFilters,
  zoomLevel: 100,
  collapsedSectors: new Set(),
  selectedReservationId: null,
  dragState: initialDragState,

  // Actions
  setSelectedDate: (date) => set({ selectedDate: date }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: initialFilters }),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  toggleSectorCollapse: (sectorId) =>
    set((state) => {
      const newCollapsed = new Set(state.collapsedSectors);
      if (newCollapsed.has(sectorId)) {
        newCollapsed.delete(sectorId);
      } else {
        newCollapsed.add(sectorId);
      }
      return { collapsedSectors: newCollapsed };
    }),

  setSelectedReservation: (id) => set({ selectedReservationId: id }),

  setDragState: (dragState) =>
    set((state) => ({
      dragState: { ...state.dragState, ...dragState },
    })),

  resetDragState: () => set({ dragState: initialDragState }),

  // CRUD
  addReservation: (reservation) =>
    set((state) => ({
      reservations: [...state.reservations, reservation],
    })),

  updateReservation: (id, updates) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    })),

  deleteReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
      selectedReservationId:
        state.selectedReservationId === id ? null : state.selectedReservationId,
    })),

  updateReservationStatus: (id, status) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
      ),
    })),

  duplicateReservation: (id) => {
    const state = get();
    const original = state.reservations.find((r) => r.id === id);
    if (!original) return null;

    const newReservation: Reservation = {
      ...original,
      id: `RES_${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      reservations: [...state.reservations, newReservation],
    }));

    return newReservation;
  },

  // Computed
  getFilteredReservations: () => {
    const state = get();
    const { filters, selectedDate, reservations, tables } = state;

    return reservations.filter((reservation) => {
      // Date filter
      if (!isSameDay(parseISO(reservation.startTime), selectedDate)) {
        return false;
      }

      // Sector filter
      if (filters.sectorIds.length > 0) {
        const table = tables.find((t) => t.id === reservation.tableId);
        if (!table || !filters.sectorIds.includes(table.sectorId)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && reservation.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = reservation.customer.name.toLowerCase().includes(query);
        const matchesPhone = reservation.customer.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  },

  getReservationsForTable: (tableId) => {
    const state = get();
    return state.getFilteredReservations().filter((r) => r.tableId === tableId);
  },

  getTableById: (tableId) => {
    return get().tables.find((t) => t.id === tableId);
  },

  getSectorById: (sectorId) => {
    return get().sectors.find((s) => s.id === sectorId);
  },

  getReservationById: (id) => {
    return get().reservations.find((r) => r.id === id);
  },
}));
