import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';
import { useReservationStore } from '@/stores/reservationStore';
import type { DragState, Reservation } from '@/types/models';

// Mock the stores and hooks
vi.mock('@/stores/reservationStore');
vi.mock('../../../hooks/useConflictDetection', () => ({
  useConflictDetection: () => ({
    checkConflict: vi.fn(() => ({ hasConflict: false })),
  }),
}));

const mockSelectedDate = new Date('2024-01-15T00:00:00');
const mockReservation: Reservation = {
  id: 'res-1',
  tableId: 'table-1',
  customer: { name: 'John Doe', phone: '123456789' },
  partySize: 4,
  startTime: '2024-01-15T12:00:00',
  endTime: '2024-01-15T14:00:00',
  durationMinutes: 120,
  status: 'CONFIRMED',
  priority: 'STANDARD',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
};

const initialDragState: DragState = {
  isDragging: false,
  dragType: null,
  startSlot: null,
  endSlot: null,
  tableId: null,
  reservationId: null,
};

describe('useDragAndDrop', () => {
  let mockSetDragState: ReturnType<typeof vi.fn>;
  let mockResetDragState: ReturnType<typeof vi.fn>;
  let currentDragState: DragState;

  beforeEach(() => {
    currentDragState = { ...initialDragState };
    mockSetDragState = vi.fn((updates: Partial<DragState>) => {
      currentDragState = { ...currentDragState, ...updates };
    });
    mockResetDragState = vi.fn(() => {
      currentDragState = { ...initialDragState };
    });

    vi.mocked(useReservationStore).mockImplementation((selector) => {
      const state = {
        selectedDate: mockSelectedDate,
        zoomLevel: 100,
        dragState: currentDragState,
        setDragState: mockSetDragState,
        resetDragState: mockResetDragState,
        getReservationById: (id: string) => (id === 'res-1' ? mockReservation : undefined),
      };
      return selector(state as never);
    });
  });

  const createMockGridRect = (left = 0, width = 1440): DOMRect => ({
    left,
    right: left + width,
    top: 0,
    bottom: 600,
    width,
    height: 600,
    x: left,
    y: 0,
    toJSON: () => ({}),
  });

  describe('Create Drag', () => {
    it('should start create drag on empty grid', () => {
      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleCreateDragStart('table-1', 150, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({
          isDragging: true,
          dragType: 'create',
          tableId: 'table-1',
        })
      );
    });

    it('should update end slot during create drag move', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 10,
        endSlot: 11,
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleCreateDragMove(300, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({ endSlot: expect.any(Number) })
      );
    });

    it('should return result on create drag end', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 48, // 12:00
        endSlot: 52, // 13:00
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());

      let createResult: ReturnType<typeof result.current.handleCreateDragEnd> | null = null;
      act(() => {
        createResult = result.current.handleCreateDragEnd();
      });

      expect(createResult).not.toBeNull();
      if (createResult) {
        const createObj = createResult as { tableId: string; durationMinutes: number };
        expect(createObj.tableId).toBe('table-1');
        expect(createObj.durationMinutes).toBe(60); // 4 slots * 15 min
      }
      expect(mockResetDragState).toHaveBeenCalled();
    });

    it('should enforce minimum duration of 2 slots (30 min)', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 10,
        endSlot: 11,
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        // Try to move to same slot (would be 0 duration)
        result.current.handleCreateDragMove(155, gridRect);
      });

      // Should enforce minimum of startSlot + 2
      const call = mockSetDragState.mock.calls[0][0];
      expect(call.endSlot).toBeGreaterThanOrEqual(12); // startSlot (10) + 2
    });
  });

  describe('Move Drag', () => {
    it('should start move drag on existing reservation', () => {
      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleMoveDragStart('res-1', 'table-1', 720, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({
          isDragging: true,
          dragType: 'move',
          reservationId: 'res-1',
          tableId: 'table-1',
        })
      );
    });

    it('should update position during move drag', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'move',
        startSlot: 48,
        endSlot: 48,
        tableId: 'table-1',
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();
      const getTableByY = vi.fn(() => 'table-2');

      act(() => {
        result.current.handleMoveDragMove(800, 150, gridRect, getTableByY);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({
          endSlot: expect.any(Number),
          tableId: 'table-2',
        })
      );
    });

    it('should return move result with new position', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'move',
        startSlot: 48,
        endSlot: 52, // Moved 4 slots forward
        tableId: 'table-2',
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());

      let moveResult: ReturnType<typeof result.current.handleMoveDragEnd> | null = null;
      act(() => {
        moveResult = result.current.handleMoveDragEnd();
      });

      expect(moveResult).not.toBeNull();
      if (moveResult) {
        const moveObj = moveResult as { reservationId: string; newTableId: string };
        expect(moveObj.reservationId).toBe('res-1');
        expect(moveObj.newTableId).toBe('table-2');
      }
      expect(mockResetDragState).toHaveBeenCalled();
    });
  });

  describe('Resize Drag', () => {
    it('should start resize-end drag on right edge', () => {
      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleResizeDragStart('res-1', 'end', 800, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({
          isDragging: true,
          dragType: 'resize-end',
          reservationId: 'res-1',
        })
      );
    });

    it('should start resize-start drag on left edge', () => {
      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleResizeDragStart('res-1', 'start', 720, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({
          isDragging: true,
          dragType: 'resize-start',
          reservationId: 'res-1',
        })
      );
    });

    it('should update end slot during resize move', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'resize-end',
        startSlot: 56,
        endSlot: 56,
        tableId: null,
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();

      act(() => {
        result.current.handleResizeDragMove(900, gridRect);
      });

      expect(mockSetDragState).toHaveBeenCalledWith(
        expect.objectContaining({ endSlot: expect.any(Number) })
      );
    });

    it('should return resize result with new duration', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'resize-end',
        startSlot: 56,
        endSlot: 60, // Extended by 4 slots
        tableId: null,
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());

      let resizeResult: ReturnType<typeof result.current.handleResizeDragEnd> | null = null;
      act(() => {
        resizeResult = result.current.handleResizeDragEnd();
      });

      expect(resizeResult).not.toBeNull();
      if (resizeResult) {
        const resizeObj = resizeResult as { reservationId: string; newDurationMinutes: number };
        expect(resizeObj.reservationId).toBe('res-1');
        expect(resizeObj.newDurationMinutes).toBeGreaterThan(0);
      }
      expect(mockResetDragState).toHaveBeenCalled();
    });

    it('should enforce minimum duration of 30 minutes', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'resize-end',
        startSlot: 56,
        endSlot: 48, // Trying to shrink below minimum
        tableId: null,
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());

      let resizeResult: ReturnType<typeof result.current.handleResizeDragEnd> | null = null;
      act(() => {
        resizeResult = result.current.handleResizeDragEnd();
      });

      if (resizeResult) {
        const resizeObj = resizeResult as { newDurationMinutes: number };
        expect(resizeObj.newDurationMinutes).toBeGreaterThanOrEqual(30);
      }
    });

    it('should enforce maximum duration of 360 minutes', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'resize-end',
        startSlot: 56,
        endSlot: 100, // Trying to extend way beyond max
        tableId: null,
        reservationId: 'res-1',
      };

      const { result } = renderHook(() => useDragAndDrop());

      let resizeResult: ReturnType<typeof result.current.handleResizeDragEnd> | null = null;
      act(() => {
        resizeResult = result.current.handleResizeDragEnd();
      });

      if (resizeResult) {
        const resizeObj = resizeResult as { newDurationMinutes: number };
        expect(resizeObj.newDurationMinutes).toBeLessThanOrEqual(360);
      }
    });
  });

  describe('Cancel Drag', () => {
    it('should reset drag state on cancel', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 10,
        endSlot: 15,
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());

      act(() => {
        result.current.cancelDrag();
      });

      expect(mockResetDragState).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should return null on create drag end with missing data', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: null,
        endSlot: null,
        tableId: null,
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());

      let createResult: ReturnType<typeof result.current.handleCreateDragEnd> | null = null;
      act(() => {
        createResult = result.current.handleCreateDragEnd();
      });

      expect(createResult).toBeNull();
    });

    it('should return null on move drag end with missing reservation', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'move',
        startSlot: 48,
        endSlot: 52,
        tableId: 'table-1',
        reservationId: 'non-existent',
      };

      const { result } = renderHook(() => useDragAndDrop());

      let moveResult: ReturnType<typeof result.current.handleMoveDragEnd> | null = null;
      act(() => {
        moveResult = result.current.handleMoveDragEnd();
      });

      expect(moveResult).toBeNull();
    });

    it('should not update during move if not in move drag mode', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 10,
        endSlot: 15,
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());
      const gridRect = createMockGridRect();
      const getTableByY = vi.fn(() => 'table-2');

      act(() => {
        result.current.handleMoveDragMove(800, 150, gridRect, getTableByY);
      });

      // Should not have called setDragState for move update
      expect(mockSetDragState).not.toHaveBeenCalled();
    });
  });

  describe('Conflict Detection', () => {
    it('should report no conflict when dragState is not active', () => {
      currentDragState = { ...initialDragState };

      const { result } = renderHook(() => useDragAndDrop());

      expect(result.current.hasConflict).toBe(false);
    });

    it('should expose hasConflict state', () => {
      currentDragState = {
        isDragging: true,
        dragType: 'create',
        startSlot: 48,
        endSlot: 52,
        tableId: 'table-1',
        reservationId: null,
      };

      const { result } = renderHook(() => useDragAndDrop());

      // Default mock returns no conflict
      expect(result.current.hasConflict).toBe(false);
    });
  });
});
