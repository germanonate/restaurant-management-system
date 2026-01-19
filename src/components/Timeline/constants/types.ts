import type { UUID, ReservationStatus, Priority } from '@/types/models';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ViewportState {
  scrollLeft: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface DragPreviewData {
  tableId: UUID;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface CreateReservationData {
  customer: { name: string; phone: string; email?: string; notes?: string };
  partySize: number;
  durationMinutes: number;
  status: ReservationStatus;
  priority: Priority;
  notes?: string;
  tableId?: string;
  startTime?: string;
}

// ============================================================================
// Viewport Utilities
// ============================================================================

/**
 * Create initial viewport state
 */
export function createInitialViewport(): ViewportState {
  return {
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  };
}

/**
 * Update viewport dimensions
 */
export function updateViewportDimensions(
  scrollContainer: HTMLDivElement | null
): Partial<ViewportState> {
  if (!scrollContainer) return {};
  return {
    viewportWidth: scrollContainer.clientWidth,
    viewportHeight: scrollContainer.clientHeight,
  };
}
