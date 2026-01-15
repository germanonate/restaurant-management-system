import { useCallback, useRef } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useConflictDetection } from './useConflictDetection';
import {
  snapToSlotIndex,
  slotIndexToTime,
  slotsToDuration,
  clampSlotIndex,
  BASE_SLOT_WIDTH,
} from '@/utils/timeCalculations';
import type { UUID, DragState } from '@/types/models';
import { addMinutes } from 'date-fns';

interface DragCreateResult {
  tableId: UUID;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

interface DragMoveResult {
  reservationId: UUID;
  newTableId: UUID;
  newStartTime: Date;
  newEndTime: Date;
}

interface DragResizeResult {
  reservationId: UUID;
  newStartTime: Date;
  newEndTime: Date;
  newDurationMinutes: number;
}

interface UseDragAndDropReturn {
  // Create drag
  handleCreateDragStart: (tableId: UUID, clientX: number, gridRect: DOMRect) => void;
  handleCreateDragMove: (clientX: number, gridRect: DOMRect) => void;
  handleCreateDragEnd: () => DragCreateResult | null;

  // Move drag
  handleMoveDragStart: (reservationId: UUID, tableId: UUID, clientX: number, gridRect: DOMRect) => void;
  handleMoveDragMove: (clientX: number, clientY: number, gridRect: DOMRect, tableHeight: number) => void;
  handleMoveDragEnd: (tableIds: UUID[]) => DragMoveResult | null;

  // Resize drag
  handleResizeDragStart: (
    reservationId: UUID,
    edge: 'start' | 'end',
    clientX: number,
    gridRect: DOMRect
  ) => void;
  handleResizeDragMove: (clientX: number, gridRect: DOMRect) => void;
  handleResizeDragEnd: () => DragResizeResult | null;

  // Cancel
  cancelDrag: () => void;

  // State
  dragState: DragState;
  hasConflict: boolean;
}

export function useDragAndDrop(): UseDragAndDropReturn {
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const zoomLevel = useReservationStore((state) => state.zoomLevel);
  const dragState = useReservationStore((state) => state.dragState);
  const setDragState = useReservationStore((state) => state.setDragState);
  const resetDragState = useReservationStore((state) => state.resetDragState);
  const getReservationById = useReservationStore((state) => state.getReservationById);

  const { checkConflict } = useConflictDetection();

  const originalStartSlotRef = useRef<number | null>(null);
  const slotWidth = (BASE_SLOT_WIDTH * zoomLevel) / 100;

  const getSlotFromX = useCallback(
    (clientX: number, gridRect: DOMRect): number => {
      const x = clientX - gridRect.left;
      return clampSlotIndex(snapToSlotIndex(x, slotWidth));
    },
    [slotWidth]
  );

  const getTableIndexFromY = useCallback(
    (clientY: number, gridRect: DOMRect, tableHeight: number): number => {
      const y = clientY - gridRect.top;
      return Math.floor(y / tableHeight);
    },
    []
  );

  // Create drag handlers
  const handleCreateDragStart = useCallback(
    (tableId: UUID, clientX: number, gridRect: DOMRect) => {
      const slotIndex = getSlotFromX(clientX, gridRect);
      setDragState({
        isDragging: true,
        dragType: 'create',
        tableId,
        startSlot: slotIndex,
        endSlot: slotIndex + 1,
        reservationId: null,
      });
    },
    [getSlotFromX, setDragState]
  );

  const handleCreateDragMove = useCallback(
    (clientX: number, gridRect: DOMRect) => {
      if (dragState.dragType !== 'create' || dragState.startSlot === null) return;

      const currentSlot = getSlotFromX(clientX, gridRect);
      const endSlot = Math.max(currentSlot, dragState.startSlot + 2); // Minimum 30 min

      setDragState({ endSlot });
    },
    [dragState.dragType, dragState.startSlot, getSlotFromX, setDragState]
  );

  const handleCreateDragEnd = useCallback((): DragCreateResult | null => {
    if (
      dragState.dragType !== 'create' ||
      dragState.startSlot === null ||
      dragState.endSlot === null ||
      dragState.tableId === null
    ) {
      resetDragState();
      return null;
    }

    const startTime = slotIndexToTime(dragState.startSlot, selectedDate);
    const endTime = slotIndexToTime(dragState.endSlot, selectedDate);
    const durationMinutes = slotsToDuration(dragState.endSlot - dragState.startSlot);

    const result: DragCreateResult = {
      tableId: dragState.tableId,
      startTime,
      endTime,
      durationMinutes,
    };

    resetDragState();
    return result;
  }, [dragState, selectedDate, resetDragState]);

  // Move drag handlers
  const handleMoveDragStart = useCallback(
    (reservationId: UUID, tableId: UUID, clientX: number, gridRect: DOMRect) => {
      const reservation = getReservationById(reservationId);
      if (!reservation) return;

      const slotIndex = getSlotFromX(clientX, gridRect);
      originalStartSlotRef.current = slotIndex;

      setDragState({
        isDragging: true,
        dragType: 'move',
        tableId,
        startSlot: slotIndex,
        endSlot: slotIndex,
        reservationId,
      });
    },
    [getSlotFromX, setDragState, getReservationById]
  );

  const handleMoveDragMove = useCallback(
    (clientX: number, clientY: number, gridRect: DOMRect, tableHeight: number) => {
      if (dragState.dragType !== 'move') return;

      const currentSlot = getSlotFromX(clientX, gridRect);
      // Calculate table index for potential future use
      getTableIndexFromY(clientY, gridRect, tableHeight);

      setDragState({
        endSlot: currentSlot,
      });
    },
    [dragState.dragType, getSlotFromX, getTableIndexFromY, setDragState]
  );

  const handleMoveDragEnd = useCallback(
    (_tableIds: UUID[]): DragMoveResult | null => {
      if (
        dragState.dragType !== 'move' ||
        dragState.reservationId === null ||
        dragState.startSlot === null ||
        dragState.endSlot === null
      ) {
        resetDragState();
        return null;
      }

      const reservation = getReservationById(dragState.reservationId);
      if (!reservation) {
        resetDragState();
        return null;
      }

      const slotDiff = dragState.endSlot - dragState.startSlot;
      const newStartTime = addMinutes(
        slotIndexToTime(0, selectedDate),
        (dragState.startSlot + slotDiff) * 15
      );
      const newEndTime = addMinutes(newStartTime, reservation.durationMinutes);

      const result: DragMoveResult = {
        reservationId: dragState.reservationId,
        newTableId: dragState.tableId ?? reservation.tableId,
        newStartTime,
        newEndTime,
      };

      resetDragState();
      originalStartSlotRef.current = null;
      return result;
    },
    [dragState, selectedDate, resetDragState, getReservationById]
  );

  // Resize drag handlers
  const handleResizeDragStart = useCallback(
    (reservationId: UUID, edge: 'start' | 'end', clientX: number, gridRect: DOMRect) => {
      const slotIndex = getSlotFromX(clientX, gridRect);

      setDragState({
        isDragging: true,
        dragType: edge === 'start' ? 'resize-start' : 'resize-end',
        reservationId,
        startSlot: slotIndex,
        endSlot: slotIndex,
        tableId: null,
      });
    },
    [getSlotFromX, setDragState]
  );

  const handleResizeDragMove = useCallback(
    (clientX: number, gridRect: DOMRect) => {
      if (
        dragState.dragType !== 'resize-start' &&
        dragState.dragType !== 'resize-end'
      )
        return;

      const currentSlot = getSlotFromX(clientX, gridRect);
      setDragState({ endSlot: currentSlot });
    },
    [dragState.dragType, getSlotFromX, setDragState]
  );

  const handleResizeDragEnd = useCallback((): DragResizeResult | null => {
    if (
      (dragState.dragType !== 'resize-start' && dragState.dragType !== 'resize-end') ||
      dragState.reservationId === null ||
      dragState.startSlot === null ||
      dragState.endSlot === null
    ) {
      resetDragState();
      return null;
    }

    const reservation = getReservationById(dragState.reservationId);
    if (!reservation) {
      resetDragState();
      return null;
    }

    const slotDiff = dragState.endSlot - dragState.startSlot;
    let newStartTime: Date;
    let newEndTime: Date;
    let newDurationMinutes: number;

    if (dragState.dragType === 'resize-end') {
      newStartTime = new Date(reservation.startTime);
      newDurationMinutes = Math.max(30, Math.min(240, reservation.durationMinutes + slotDiff * 15));
      newEndTime = addMinutes(newStartTime, newDurationMinutes);
    } else {
      newEndTime = new Date(reservation.endTime);
      newDurationMinutes = Math.max(30, Math.min(240, reservation.durationMinutes - slotDiff * 15));
      newStartTime = addMinutes(newEndTime, -newDurationMinutes);
    }

    const result: DragResizeResult = {
      reservationId: dragState.reservationId,
      newStartTime,
      newEndTime,
      newDurationMinutes,
    };

    resetDragState();
    return result;
  }, [dragState, resetDragState, getReservationById]);

  const cancelDrag = useCallback(() => {
    resetDragState();
    originalStartSlotRef.current = null;
  }, [resetDragState]);

  // Check for conflicts during drag
  const hasConflict = (() => {
    if (!dragState.isDragging || dragState.tableId === null) return false;

    if (dragState.dragType === 'create' && dragState.startSlot !== null && dragState.endSlot !== null) {
      const startTime = slotIndexToTime(dragState.startSlot, selectedDate);
      const endTime = slotIndexToTime(dragState.endSlot, selectedDate);

      const conflict = checkConflict({
        tableId: dragState.tableId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return conflict.hasConflict;
    }

    return false;
  })();

  return {
    handleCreateDragStart,
    handleCreateDragMove,
    handleCreateDragEnd,
    handleMoveDragStart,
    handleMoveDragMove,
    handleMoveDragEnd,
    handleResizeDragStart,
    handleResizeDragMove,
    handleResizeDragEnd,
    cancelDrag,
    dragState,
    hasConflict,
  };
}
