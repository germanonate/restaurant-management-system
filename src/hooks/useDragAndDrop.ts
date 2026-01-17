import { useCallback, useRef } from 'react';
import { useReservationStore } from '@/stores/reservationStore';
import { useConflictDetection } from './useConflictDetection';
import {
  snapToSlotIndex,
  slotIndexToTime,
  slotsToDuration,
  clampSlotIndex,
  timeToSlotIndex,
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
  handleMoveDragMove: (clientX: number, clientY: number, gridRect: DOMRect, getTableByY: (y: number) => UUID | null) => void;
  handleMoveDragEnd: () => DragMoveResult | null;

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
      // Min 2 slots (30 min), max 24 slots (6 hours)
      const minEndSlot = dragState.startSlot + 2;
      const maxEndSlot = dragState.startSlot + 24;
      const endSlot = Math.max(minEndSlot, Math.min(maxEndSlot, currentSlot));

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
    (clientX: number, clientY: number, gridRect: DOMRect, getTableByY: (y: number) => UUID | null) => {
      if (dragState.dragType !== 'move') return;

      const currentSlot = getSlotFromX(clientX, gridRect);
      const y = clientY - gridRect.top;
      const newTableId = getTableByY(y);

      setDragState({
        endSlot: currentSlot,
        tableId: newTableId ?? dragState.tableId,
      });
    },
    [dragState.dragType, dragState.tableId, getSlotFromX, setDragState]
  );

  const handleMoveDragEnd = useCallback(
    (): DragMoveResult | null => {
      if (
        dragState.dragType !== 'move' ||
        dragState.reservationId === null ||
        dragState.startSlot === null ||
        dragState.endSlot === null ||
        dragState.tableId === null
      ) {
        resetDragState();
        return null;
      }

      const reservation = getReservationById(dragState.reservationId);
      if (!reservation) {
        resetDragState();
        return null;
      }

      // Calculate the slot difference (how many slots the mouse moved)
      const slotDiff = dragState.endSlot - dragState.startSlot;

      // Get the original reservation's start slot using the proper utility
      const reservationStartTime = new Date(reservation.startTime);
      const originalStartSlot = timeToSlotIndex(reservationStartTime, selectedDate);

      // Calculate new start slot by adding the difference
      const newStartSlot = clampSlotIndex(originalStartSlot + slotDiff);

      // Convert slot to time
      const newStartTime = slotIndexToTime(newStartSlot, selectedDate);
      const newEndTime = addMinutes(newStartTime, reservation.durationMinutes);

      const result: DragMoveResult = {
        reservationId: dragState.reservationId,
        newTableId: dragState.tableId,
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

    // Duration limits: min 30 minutes (2 slots), max 6 hours (24 slots = 360 minutes)
    const MIN_DURATION = 30;
    const MAX_DURATION = 360;

    if (dragState.dragType === 'resize-end') {
      newStartTime = new Date(reservation.startTime);
      newDurationMinutes = Math.max(MIN_DURATION, Math.min(MAX_DURATION, reservation.durationMinutes + slotDiff * 15));
      newEndTime = addMinutes(newStartTime, newDurationMinutes);
    } else {
      newEndTime = new Date(reservation.endTime);
      newDurationMinutes = Math.max(MIN_DURATION, Math.min(MAX_DURATION, reservation.durationMinutes - slotDiff * 15));
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
    if (!dragState.isDragging || dragState.startSlot === null || dragState.endSlot === null) {
      return false;
    }

    // Create operation
    if (dragState.dragType === 'create' && dragState.tableId !== null) {
      const startTime = slotIndexToTime(dragState.startSlot, selectedDate);
      const endTime = slotIndexToTime(dragState.endSlot, selectedDate);

      const conflict = checkConflict({
        tableId: dragState.tableId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return conflict.hasConflict;
    }

    // Move operation
    if (dragState.dragType === 'move' && dragState.reservationId !== null && dragState.tableId !== null) {
      const reservation = getReservationById(dragState.reservationId);
      if (!reservation) return false;

      const slotDiff = dragState.endSlot - dragState.startSlot;
      const originalStartSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
      const newStartSlot = clampSlotIndex(originalStartSlot + slotDiff);
      const newStartTime = slotIndexToTime(newStartSlot, selectedDate);
      const newEndTime = addMinutes(newStartTime, reservation.durationMinutes);

      const conflict = checkConflict(
        {
          tableId: dragState.tableId,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        },
        dragState.reservationId
      );

      return conflict.hasConflict;
    }

    // Resize operation
    if ((dragState.dragType === 'resize-start' || dragState.dragType === 'resize-end') && dragState.reservationId !== null) {
      const reservation = getReservationById(dragState.reservationId);
      if (!reservation) return false;

      const slotDiff = dragState.endSlot - dragState.startSlot;
      const originalStartSlot = timeToSlotIndex(new Date(reservation.startTime), selectedDate);
      const originalDurationSlots = Math.ceil(reservation.durationMinutes / 15);

      let newStartSlot: number;
      let newDurationSlots: number;

      if (dragState.dragType === 'resize-end') {
        newStartSlot = originalStartSlot;
        newDurationSlots = Math.max(2, Math.min(24, originalDurationSlots + slotDiff));
      } else {
        newDurationSlots = Math.max(2, Math.min(24, originalDurationSlots - slotDiff));
        newStartSlot = originalStartSlot + (originalDurationSlots - newDurationSlots);
      }

      const newStartTime = slotIndexToTime(newStartSlot, selectedDate);
      const newEndTime = addMinutes(newStartTime, newDurationSlots * 15);

      const conflict = checkConflict(
        {
          tableId: reservation.tableId,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        },
        dragState.reservationId
      );

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
