# Reservation Timeline

## 1) Objective

Design and implement **Reservation Timeline** — a production-ready visual timeline interface for managing restaurant reservations in real-time. The system must:

- Provide an **interactive timeline grid** (time on X-axis, tables on Y-axis)
- Support **drag & drop** for creating, moving, and resizing reservation blocks
- Handle **real-time conflict detection** and visual collision warnings
- Enable **multi-table operations** and bulk scheduling
- Display **color-coded status** with smooth transitions
- Optional: Support **multiple time views** (day, 3-day, week)
- Maintain **60fps performance** with 200+ concurrent reservations

Think of this as the **scheduling interface of a real restaurant management system**: the **CORE** should be shippable in **~4 hours**, and **BONUS** items are where senior engineers demonstrate mastery (auto-scheduling, capacity analytics, etc.).

You may use any framework, libraries, and techniques you deem appropriate (React, timeline libraries, custom canvas, etc.), as long as you justify your choices in the README and credit external sources. The work must be done individually. After submission, you will conduct a brief technical defense: demo the working solution, explain rendering strategy, discuss scheduling algorithms, and answer questions on performance, state management, and UX.

---

## 2) Time Conventions & Grid System

- **Time slot**: 15 minutes (smallest granularity)
- **Time range**: 11:00 - 00:00 (13 hours = 52 slots)
- **Default reservation duration**: 90 minutes (6 slots)
- **Grid cell**: 1 slot = 60px width on screen (zoomable)
- **Snap behavior**: Drag operations snap to 15-minute boundaries
- **Timezone**: Restaurant's local timezone (configurable)
- **Visual indication**: Current time marker (red line)

---

## 3) Domain Model

```typescript
type UUID = string;
type ISODateTime = string; // e.g., "2025-10-15T20:00:00-03:00"
type Minutes = number;
type SlotIndex = number; // 0-based, each slot = 15min

type ReservationStatus = 
  | 'PENDING'      // Awaiting confirmation
  | 'CONFIRMED'    // Confirmed, not yet seated
  | 'SEATED'       // Currently at the table
  | 'FINISHED'     // Completed
  | 'NO_SHOW'      // Didn't arrive
  | 'CANCELLED';   // Cancelled

type Priority = 'STANDARD' | 'VIP' | 'LARGE_GROUP';

interface Sector {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
}

interface Table {
  id: UUID;
  sectorId: UUID;
  name: string;
  capacity: {
    min: number;
    max: number;
  };
  sortOrder: number; // for Y-axis ordering
}

interface Customer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface Reservation {
  id: UUID;
  tableId: UUID;
  customer: Customer;
  partySize: number;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMinutes: Minutes;
  status: ReservationStatus;
  priority: Priority;
  notes?: string;
  source?: string; // 'phone', 'web', 'walkin', 'app'
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface TimelineConfig {
  date: string; // "2025-10-15"
  startHour: number; // 11
  endHour: number; // 24 (or 0 for midnight)
  slotMinutes: Minutes; // 15
  viewMode: 'day' | '3-day' | 'week';
}

interface ConflictCheck {
  hasConflict: boolean;
  conflictingReservationIds: UUID[];
  reason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}
```

---

## 4) CORE Requirements (target: ~4 hours)

### 4.1 Timeline Grid Rendering
- **Two-axis layout**:
  - **X-axis (horizontal)**: Time slots from 11:00 to 00:00 in 15-min increments
  - **Y-axis (vertical)**: Tables grouped by sector
- **Grid structure**:
  - Header row with time labels (11:00, 11:15, 11:30...)
  - Vertical lines every 30 minutes (bold every hour)
  - Horizontal lines separating tables
  - Sector group headers (collapsed/expandable)
- **Current time indicator**: Red vertical line at current time
- **Scrollable viewport**: Horizontal and vertical scroll with sticky headers

### 4.2 Reservation Blocks
- **Visual blocks** representing reservations:
  - Width = duration (90min = 6 slots = 360px at 1x zoom)
  - Height = table row height (60px)
  - Position = start time (X) + table (Y)
- **Color coding by status**:
  - PENDING: Yellow (#FCD34D)
  - CONFIRMED: Blue (#3B82F6)
  - SEATED: Green (#10B981)
  - FINISHED: Gray (#9CA3AF)
  - NO_SHOW: Red (#EF4444)
  - CANCELLED: Striped gray
- **Block content**:
  - Customer name
  - Party size (icon + number)
  - Time range (20:00-21:30)
  - Priority badge (VIP, Large Group)
- **Hover state**: Show tooltip with full details
- **Selection**: Click to select; multi-select with Cmd/Ctrl + click

### 4.3 Drag & Drop - Create Reservation
- **Click and drag on empty space** to create new reservation:
  1. Mouse down on empty cell → start creating
  2. Drag right → expand duration (snaps to 15-min slots)
  3. Release → open quick-create modal with pre-filled time/table
- **Quick-create modal** fields:
  - Customer name (required)
  - Phone (required)
  - Party size (required)
  - Duration (pre-filled, editable)
  - Status (default: CONFIRMED)
  - Priority (default: STANDARD)
  - Notes
- **Validation**:
  - Party size must be within table capacity
  - Duration minimum 30 minutes, maximum 6 hours
  - Check for conflicts before creating

### 4.4 Drag & Drop - Move Reservation
- **Drag existing block horizontally** → change time (start/end shift together)
- **Drag existing block vertically** → change table
- **Drag both axes** → change both time and table
- **Snap to grid**: Positions snap to 15-minute slots
- **Ghost preview**: Show semi-transparent preview while dragging
- **Conflict detection**: Show red warning if target position conflicts
- **Validation**: Prevent drop if conflict exists or outside service hours
- **Optimistic update**: UI updates immediately; rollback if server rejects

### 4.5 Drag & Drop - Resize Reservation
- **Drag right edge** → extend duration
- **Drag left edge** → change start time + duration
- **Minimum duration**: 30 minutes (2 slots)
- **Maximum duration**: 4 hours (16 slots)
- **Snap to slots**: Edges snap to 15-minute boundaries
- **Real-time duration display**: Show new duration while dragging
- **Conflict check**: Warn if resize causes overlap

### 4.6 Context Menu & Actions
- **Right-click on reservation** → context menu:
  - Edit details (open full modal)
  - Change status → submenu (PENDING, CONFIRMED, SEATED, etc.)
  - Mark as no-show
  - Cancel reservation
  - Duplicate (copy to new time/table)
  - Delete
- **Keyboard shortcuts (optional)**:
  - `Delete` → delete selected
  - `Ctrl/Cmd + C` → copy selected
  - `Ctrl/Cmd + V` → paste at current position
  - `Ctrl/Cmd + D` → duplicate selected
  - `Ctrl/Cmd + Z` → undo
  - `Ctrl/Cmd + Shift + Z` → redo

### 4.7 Conflict Detection & Validation
- **Real-time conflict checking**:
  - Detect overlapping reservations on same table
  - Warn if party size exceeds table capacity
  - Prevent reservations outside service hours
- **Visual warnings**:
  - Red border on conflicting blocks
  - Warning icon on block
  - Tooltip explaining conflict
- **Conflict resolution**:
  - Auto-suggest alternative tables
  - Auto-suggest alternative times (±15, ±30 min)
  - Manual override option (with confirmation)

### 4.8 Filtering & View Controls
- **Top toolbar**:
  - Date picker (navigate days)
  - Sector filter (multi-select dropdown)
  - Status filter (show/hide by status)
  - Search by customer name/phone
  - Zoom controls (50%, 75%, 100%, 125%, 150%)
- **Sector collapse/expand**: Click sector header to collapse all tables in sector
- **Active filters indicator**: Chip showing active filters with count

---

## 5) Acceptance Criteria (CORE)

✅ **Timeline Grid**: Renders correctly with time on X-axis, tables on Y-axis; sector grouping works  
✅ **Reservations Display**: All reservation blocks render with correct position, size, color, and content  
✅ **Create**: Can click-drag to create reservation; modal opens with correct pre-filled data  
✅ **Move**: Can drag reservation horizontally (time) and vertically (table); snaps to grid  
✅ **Resize**: Can drag edges to change duration; respects min/max constraints  
✅ **Conflict Detection**: Overlaps are detected and visually indicated; cannot drop on conflict  
✅ **Context Menu**: Right-click shows menu with all actions; actions work correctly  
✅ **Status Changes**: Can change reservation status; color updates immediately  
✅ **Filtering**: Sector, status, and search filters work; view updates in real-time  
✅ **Performance**: Smooth 60fps with 200 reservations; drag operations feel responsive  
✅ **Validation**: Cannot create invalid reservations (wrong capacity, outside hours, conflicts)  

---

## 6) Minimal Test Cases

1. **Happy path**: Click-drag empty cell → create reservation → opens modal → fill form → save → block appears
2. **Move reservation**: Drag block right 1 hour → position updates → no conflict → success
3. **Move to conflict**: Drag block onto existing reservation → red warning → cannot drop
4. **Resize**: Drag right edge → extend 30 min → duration updates → no conflict → success
5. **Change status**: Right-click → Change status to SEATED → color changes to green
6. **Filter by sector**: Select "Terrace" → only Terrace tables shown
7. **Search**: Type customer name → only matching reservations shown
8. **Multi-select**: Cmd+click 3 blocks → all selected → delete → all removed → undo → all restored
9. **Capacity validation**: Try to create 8-person party on 2-person table → shows error
10. **Performance**: Load 200 reservations → scroll smoothly → zoom in/out → no lag

---

## 7) BONUS (ordered by priority)

### BONUS 1 — Auto-Scheduling Assistant (HIGH PRIORITY)
- **Smart table suggestion** when creating reservation:
  - Find best available table for party size and time
  - Prioritize tables closest to party size (avoid wasting large tables)
  - Consider sector preferences
  - Show multiple options ranked by suitability
- **"Find next available" button**:
  - If requested time is full, suggest next available slot
  - Search in ±15, ±30, ±60 minute windows
  - Show all available options in a list
- **Batch scheduling**: Import CSV of reservations → auto-assign tables optimally
- **AI suggestions**: "This reservation might be a VIP" (based on history/patterns)

### BONUS 2 — Capacity Analytics Overlay
- **Capacity meter per time slot**:
  - Show bar chart above timeline indicating % capacity
  - Color-coded: Green (<70%), Yellow (70-90%), Red (>90%)
  - Click bar → jump to that time slot
- **Utilization heatmap**:
  - Toggle heatmap view showing busy/slow periods
  - Historical data comparison (this week vs last week)
- **Sector comparison**: Side-by-side capacity comparison between sectors

### BONUS 3 — Waitlist Management
- **Waitlist panel** (sidebar or modal):
  - List of customers waiting for tables
  - Party size, preferred time, how long waiting
  - Drag from waitlist to timeline to convert to reservation
- **Auto-promotion**: When table becomes available, suggest waitlist customers
- **SMS notification**: Mock sending SMS when table is ready
- **Priority queue**: VIP customers shown at top
- **Estimated wait time**: Calculate and display wait time

### BONUS 4 — Mobile-Optimized View
- **Touch-optimized drag & drop**: Works well on tablets
- **Compressed day view**: Optimized for mobile screens
- **Swipe navigation**: Swipe to change days
- **Bottom sheet modals**: Mobile-friendly modal patterns
- **Simplified interface**: Reduced controls for mobile
- **Offline mode**: Cache data for offline viewing

### BONUS 5 — Advanced Animations & Transitions
- **Smooth block animations**: 
  - Spring physics when dropping blocks
  - Fade in when creating
  - Shrink out when deleting
- **Status change animations**: Color transition with ripple effect
- **Timeline scrubbing**: Drag time indicator to "scrub" through day
- **Stagger animations**: When filtering, blocks animate in sequentially
- **Conflict pulse**: Red glow animation on conflicting blocks
- **Capacity wave**: Animated wave showing capacity filling up

### BONUS 6 — Export & Reporting
- **Export timeline as image**: PNG/PDF of current view
- **Print layout**: Print-friendly timeline view
- **Reservation report**: Generate CSV/Excel of all reservations
- **Summary statistics**: Total covers, average party size, turnover rate
- **Shift report**: Breakdown by lunch/dinner shifts
- **Email digest**: Generate email-friendly HTML summary

### BONUS 7 — Accessibility & Keyboard Navigation
- **Full keyboard navigation**: 
  - Arrow keys to navigate grid
  - Enter to select/edit reservation
  - Tab through all interactive elements
- **Screen reader support**: 
  - Announce reservation details
  - Announce conflicts and warnings
  - Live regions for updates
- **Keyboard shortcuts help**: Press `?` to show shortcuts modal
- **Focus trapping**: Proper focus management in modals
- **High contrast mode**: Alternative color scheme
- **Reduced motion**: Respect `prefers-reduced-motion`
---

## 8) Seed Data (example)

```json
{
  "date": "2025-10-15",
  "restaurant": {
    "id": "R1",
    "name": "Bistro Central",
    "timezone": "America/Argentina/Buenos_Aires",
    "serviceHours": [
      { "start": "12:00", "end": "16:00" },
      { "start": "20:00", "end": "00:00" }
    ]
  },
  "sectors": [
    { "id": "S1", "name": "Main Hall", "color": "#3B82F6", "sortOrder": 0 },
    { "id": "S2", "name": "Terrace", "color": "#10B981", "sortOrder": 1 }
  ],
  "tables": [
    { "id": "T1", "sectorId": "S1", "name": "Table 1", "capacity": { "min": 2, "max": 2 }, "sortOrder": 0 },
    { "id": "T2", "sectorId": "S1", "name": "Table 2", "capacity": { "min": 2, "max": 4 }, "sortOrder": 1 },
    { "id": "T3", "sectorId": "S1", "name": "Table 3", "capacity": { "min": 4, "max": 6 }, "sortOrder": 2 },
    { "id": "T4", "sectorId": "S2", "name": "Table 4", "capacity": { "min": 2, "max": 4 }, "sortOrder": 0 },
    { "id": "T5", "sectorId": "S2", "name": "Table 5", "capacity": { "min": 4, "max": 8 }, "sortOrder": 1 }
  ],
  "reservations": [
    {
      "id": "RES_001",
      "tableId": "T1",
      "customer": { "name": "John Doe", "phone": "+54 9 11 5555-1234", "email": "john@example.com" },
      "partySize": 2,
      "startTime": "2025-10-15T20:00:00-03:00",
      "endTime": "2025-10-15T21:30:00-03:00",
      "durationMinutes": 90,
      "status": "CONFIRMED",
      "priority": "STANDARD",
      "source": "web",
      "createdAt": "2025-10-14T15:30:00-03:00",
      "updatedAt": "2025-10-14T15:30:00-03:00"
    },
    {
      "id": "RES_002",
      "tableId": "T3",
      "customer": { "name": "Jane Smith", "phone": "+54 9 11 5555-5678", "email": "jane@example.com" },
      "partySize": 6,
      "startTime": "2025-10-15T20:30:00-03:00",
      "endTime": "2025-10-15T22:00:00-03:00",
      "durationMinutes": 90,
      "status": "SEATED",
      "priority": "VIP",
      "notes": "Birthday celebration",
      "source": "phone",
      "createdAt": "2025-10-15T19:45:00-03:00",
      "updatedAt": "2025-10-15T20:35:00-03:00"
    }
  ]
}
```

Provide generator function to create 100+ random reservations for testing performance.

---

## 9) Technical Requirements

### Stack
- **Framework**: React 18+ (recommended) NextJs
- **Language**: TypeScript (strict mode)
- **Timeline Library** (optional):
  - Build from scratch (most control, recommended)
  - react-big-calendar (needs heavy customization)
  - FullCalendar (resource timeline view)
  - vis-timeline (good but needs React wrapper)
  - Justify your choice in README
- **Drag & Drop**: 
  - react-dnd (recommended)
  - @dnd-kit (modern alternative)
  - native HTML5 (lightweight but more work)
- **Date/Time**: date-fns or Luxon (avoid moment.js)
- **Build Tool**: Vite or Next.js
- **Styling**: TailwindCSS (recommended) or CSS Modules
- **State Management**: Zustand, Jotai, or Redux Toolkit
- **Testing**: Vitest + Testing Library (min. 5 tests)

### Architecture
- **Virtual scrolling**: For handling 50+ tables efficiently
- **Memoization**: Prevent unnecessary re-renders of grid cells
- **Coordinate system**: Clean separation of time/table to pixel conversions
- **Event handlers**: Efficient drag & drop with requestAnimationFrame
- **State normalization**: Normalize reservations by table and time for fast lookups

### Performance
- **60fps scrolling**: Smooth horizontal and vertical scroll
- **Fast drag operations**: Sub-50ms drag response time
- **Efficient rendering**: Only render visible rows/columns
- **Debounced operations**: Search, filter debounced to 300ms
- **Optimistic updates**: Immediate UI feedback for all mutations

### Quality
- **Bundle size**: Initial bundle <400KB (gzipped)
- **Lighthouse**: Score ≥85 performance
- **Accessibility**: Axe DevTools 0 violations
- **Browser support**: Chrome, Firefox, Safari, Edge (modern versions)

---

## 10) Deliverables

### Required
1. **README.md**
   - Setup instructions
   - Technology choices and justifications
   - Architecture decisions (rendering strategy, state management, drag & drop approach)
   - Conflict detection algorithm explanation
   - Known limitations
   - Screenshots/GIF of the timeline

2. **Source Code**
   - Clean TypeScript with proper types
   - Well-organized component structure
   - Separation: grid rendering, drag & drop logic, business logic
   - Comments on complex algorithms (coordinate transforms, conflict detection)
   - At least 5 meaningful tests:
     - Reservation creation
     - Drag & drop operations
     - Conflict detection
     - Filtering
     - Resize operations

3. **Demo Data**
   - Seed file with 50+ reservations
   - Data generator for stress testing (200+ reservations)

### BONUS
4. **Deployed Application**
   - Live URL with demo data pre-loaded
   - No authentication required

5. **Video Demo** (optional)
   - 2-3 minute walkthrough
   - Show drag & drop, conflict detection, filtering

---

**Recommendation**: Complete CORE with excellent UX and performance first. Then add BONUS 1 (auto-scheduling) as it's most valuable to users. Choose 1-2 additional BONUS items that play to your strengths.

---

Good luck! 📅✨