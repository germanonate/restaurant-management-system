import type { UUID } from '@/types/models';

/**
 * Toolbar zoom level constants
 */
export const ZOOM_LEVELS = [50, 75, 100, 125, 150];

/**
 * Get next zoom level (zoom in)
 */
export function getNextZoomLevel(currentZoom: number): number {
  const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
  if (currentIndex < ZOOM_LEVELS.length - 1) {
    return ZOOM_LEVELS[currentIndex + 1];
  }
  return currentZoom;
}

/**
 * Get previous zoom level (zoom out)
 */
export function getPreviousZoomLevel(currentZoom: number): number {
  const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
  if (currentIndex > 0) {
    return ZOOM_LEVELS[currentIndex - 1];
  }
  return currentZoom;
}

/**
 * Check if can zoom in
 */
export function canZoomIn(currentZoom: number): boolean {
  return currentZoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
}

/**
 * Check if can zoom out
 */
export function canZoomOut(currentZoom: number): boolean {
  return currentZoom > ZOOM_LEVELS[0];
}

/**
 * Handle sector toggle logic for filters
 */
export function handleSectorToggle(
  currentSectorIds: UUID[],
  sectorId: UUID,
  allSectors: Array<{ id: UUID }>
): UUID[] {
  let newSectorIds: UUID[];

  if (currentSectorIds.length === 0) {
    // Currently showing all - uncheck means select all except this one
    newSectorIds = allSectors.filter((s) => s.id !== sectorId).map((s) => s.id);
  } else if (currentSectorIds.includes(sectorId)) {
    // Remove from selection
    newSectorIds = currentSectorIds.filter((id) => id !== sectorId);
    // If we unchecked the last one, clear filter to show all
    if (newSectorIds.length === 0) {
      newSectorIds = [];
    }
  } else {
    // Add to selection
    newSectorIds = [...currentSectorIds, sectorId];
    // If all are now selected, clear filter to show all
    if (newSectorIds.length === allSectors.length) {
      newSectorIds = [];
    }
  }

  return newSectorIds;
}

/**
 * Check if all sectors are selected
 */
export function areAllSectorsSelected(
  selectedSectorIds: UUID[],
  totalSectors: number
): boolean {
  return selectedSectorIds.length === 0 || selectedSectorIds.length === totalSectors;
}
