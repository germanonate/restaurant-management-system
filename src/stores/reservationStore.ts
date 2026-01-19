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
import { seedRestaurant, seedSectors, seedTables, seedReservations, getTestReservations } from '@/seed/seed';
import { parseISO, isSameDay } from 'date-fns';

interface HistoryEntry {
  reservations: Reservation[];
}

const MAX_HISTORY_SIZE = 50;

interface ReservationStore {
  // Data
  restaurant: Restaurant;
  sectors: Sector[];
  tables: Table[];
  reservations: Reservation[];

  // History for undo/redo
  past: HistoryEntry[];
  future: HistoryEntry[];

  // UI State
  selectedDate: Date;
  filters: FilterState;
  zoomLevel: number;
  collapsedSectors: Set<UUID>;
  selectedReservationId: UUID | null;
  dragState: DragState;
  sidebarOpen: boolean;

  // Actions
  setSelectedDate: (date: Date) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  setZoomLevel: (level: number) => void;
  toggleSectorCollapse: (sectorId: UUID) => void;
  setSelectedReservation: (id: UUID | null) => void;
  setDragState: (state: Partial<DragState>) => void;
  resetDragState: () => void;
  toggleSidebar: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // CRUD
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: UUID, updates: Partial<Reservation>) => void;
  deleteReservation: (id: UUID) => void;
  updateReservationStatus: (id: UUID, status: ReservationStatus) => void;
  duplicateReservation: (id: UUID) => Reservation | null;

  // Test data
  testDataLoaded: boolean;
  loadTestData: () => void;

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

// Helper to save current state to history
const saveToHistory = (state: ReservationStore): { past: HistoryEntry[]; future: HistoryEntry[] } => {
  const newPast = [...state.past, { reservations: state.reservations }];
  // Limit history size
  if (newPast.length > MAX_HISTORY_SIZE) {
    newPast.shift();
  }
  return { past: newPast, future: [] };
};

export const useReservationStore = create<ReservationStore>((set, get) => ({
  // Initial data from seed
  restaurant: seedRestaurant,
  sectors: seedSectors,
  tables: seedTables,
  reservations: seedReservations,

  // History
  past: [],
  future: [],

  // Initial UI state - start with today's date
  selectedDate: (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  })(),
  filters: initialFilters,
  zoomLevel: 100,
  collapsedSectors: new Set(),
  selectedReservationId: null,
  dragState: initialDragState,
  testDataLoaded: false,
  sidebarOpen: false,

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

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Undo/Redo
  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      return {
        past: newPast,
        future: [{ reservations: state.reservations }, ...state.future],
        reservations: previous.reservations,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, { reservations: state.reservations }],
        future: newFuture,
        reservations: next.reservations,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  // CRUD (with history)
  addReservation: (reservation) =>
    set((state) => ({
      ...saveToHistory(state),
      reservations: [...state.reservations, reservation],
    })),

  updateReservation: (id, updates) =>
    set((state) => ({
      ...saveToHistory(state),
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    })),

  deleteReservation: (id) =>
    set((state) => ({
      ...saveToHistory(state),
      reservations: state.reservations.filter((r) => r.id !== id),
      selectedReservationId:
        state.selectedReservationId === id ? null : state.selectedReservationId,
    })),

  updateReservationStatus: (id, status) =>
    set((state) => ({
      ...saveToHistory(state),
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
      ...saveToHistory(state),
      reservations: [...state.reservations, newReservation],
    }));

    return newReservation;
  },

  // Test data (can only be loaded once, generated lazily)
  loadTestData: () =>
    set((state) => {
      if (state.testDataLoaded) return state;
      return {
        ...saveToHistory(state),
        reservations: [...state.reservations, ...getTestReservations()],
        testDataLoaded: true,
      };
    }),

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
