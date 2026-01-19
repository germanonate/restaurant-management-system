# Architecture & Design Decisions

## Approach
Given the 4-hour time constraint, I leveraged AI-assisted development 
(Claude Code - Opus 4.5) to accelerate implementation while focusing on:
- Architectural design and component structure
- Core algorithm implementation (conflict detection, drag-and-drop logic)
- Performance optimization strategies
- State management design

## Tech Stack Choices
- **React + TypeScript**: Type safety and component reusability
- **Vite**: Fast dev server and optimized builds
- **Zustand**: Lightweight state management, easier than Redux for time constraint
- **shadcn/ui**: Pre-built accessible components to save time
- **date-fns**: Lightweight date utilities

## Key Design Decisions
1. **Custom Timeline Grid** vs library: Built from scratch for full control
2. **State Management**: Zustand for simplicity
3. **Rendering Strategy**: CSS Grid + absolute positioning
4. **Custom Drag & Drop**: Native mouse events instead of libraries (see below)

## Drag & Drop Implementation

Custom implementation using native mouse events in `src/components/Timeline/hooks/useDragAndDrop.ts`.

**Operations:**
- **Create**: Drag on empty grid to select time range → opens reservation form
- **Move**: Drag reservation block to change time/table
- **Resize**: Drag block edges to adjust duration

**Key details:**
- 15-minute slot grid (96 slots/day)
- Real-time conflict detection with visual feedback
- Drag state managed in Zustand store
- Constraints: 30 min to 6 hour duration

## Coordinate Transforms

The timeline converts between three coordinate systems:

```
Time (Date) ←→ Slot Index ←→ Pixel Position
```

**Core functions** in `src/components/Timeline/utils/timeCalculations.ts`:

| Function | Purpose |
|----------|---------|
| `timeToSlotIndex(time, date)` | Date → slot index (0-95) |
| `slotIndexToTime(slot, date)` | Slot index → Date |
| `snapToSlotIndex(px, slotWidth)` | Pixel → nearest slot index |
| `getReservationPosition(startTime, date, slotWidth)` | ISO time → pixel X position |

**Example:** For a reservation at 14:30 on a day with 11:00 start:
- Minutes from start: 210 min (3.5 hours)
- Slot index: 210 / 15 = 14
- Pixel position: 14 × slotWidth

## Conflict Detection

Detects overlapping reservations on the same table. Located in `src/components/Timeline/utils/gridHelpers.ts`.

**Algorithm:**
```
For each existing reservation on the same table:
  1. Skip if cancelled
  2. Check interval overlap: newStart < existingEnd AND newEnd > existingStart
  3. If overlap → conflict
```

**Usage:**
- Real-time validation during drag operations
- Form validation before saving
- Visual feedback (red highlight) when conflict detected

The `useConflictDetection` hook (`src/hooks/useConflictDetection.ts`) provides:
- `checkConflict()` - Returns conflict status and conflicting IDs
- `getConflictResolutions()` - Suggests alternative tables/times
- `hasConflictingReservations()` - Batch conflict check