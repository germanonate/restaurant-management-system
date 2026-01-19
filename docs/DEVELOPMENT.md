### Project Initialization

Create a React application for managing restaurant reservations with a visual timeline interface. App name: **restaurant-management-system**

**Tech Stack:**
- React (latest) with TypeScript (strict mode)
- Vite as build tool
- pnpm as package manager

**Dependencies:**
- shadcn/ui for UI components
- Tailwind CSS for styling
- @dnd-kit/core and @dnd-kit/utilities for drag and drop
- zustand for state management
- date-fns for date/time utilities
- lucide-react for icons

**Folder Structure:**
```
src/
├── components/
│   ├── Timeline/
│   ├── ReservationBlock/
│   ├── Toolbar/
│   └── Header/
├── hooks/
│   ├── useConflictDetection.ts
│   ├── useDragAndDrop.ts
│   └── useReservations.ts
├── mocks/
│   └── mocks.ts
├── stores/
│   └── reservationStore.ts
├── types/
│   └── models.ts
├── utils/
│   ├── timeCalculations.ts
│   └── gridHelpers.ts
└── App.tsx
```

---

### Core System Specifications

**Time & Grid System:**
- Time slot granularity: 15 minutes
- Operating hours: 11:00 AM to 12:00 AM
- Grid cell width: 60px per slot (base zoom level)
- All operations snap to 15-minute boundaries
- Red vertical line indicating current time

---

### Data Model

**Type Definitions:**
```typescript
type UUID = string;
type ISODateTime = string;
type Minutes = number;
type SlotIndex = number;

type ReservationStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'SEATED' 
  | 'FINISHED' 
  | 'NO_SHOW' 
  | 'CANCELLED';

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
  sortOrder: number;
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
  source?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface TimelineConfig {
  date: string;
  startHour: number;
  endHour: number;
  slotMinutes: Minutes;
  viewMode: 'day' | '3-day' | 'week';
}

interface ConflictCheck {
  hasConflict: boolean;
  conflictingReservationIds: UUID[];
  reason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}
```

---

### Seed Data
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

---

### Feature Implementation

#### 1. Timeline Grid Component

Build a timeline grid with:
- **X-axis:** Sticky header row with time slots (11:00 to 00:00, 15-min increments)
- **Y-axis:** Sticky column with tables grouped by sector
- Vertical grid lines every 30 minutes
- Horizontal lines separating tables
- Collapsible/expandable sector headers
- Red vertical line for current time (auto-refresh every minute)
- Horizontal and vertical scrolling with sticky headers
- Split into smaller child components for maintainability

#### 2. Reservation Block Component

Display blocks with:
- **Width:** Duration-based (90min = 360px at 1x zoom)
- **Height:** 60px
- **Position:** Calculated from start time (X) and table (Y)
- **Color coding:**
  - PENDING: `#FCD34D`
  - CONFIRMED: `#3B82F6`
  - SEATED: `#10B981`
  - FINISHED: `#9CA3AF`
  - NO_SHOW: `#EF4444`
  - CANCELLED: Striped gray
- **Content:** Customer name, party size icon, time range, priority badge
- **Hover:** Tooltip with full details
- **Sheet component** for create/edit/view (shadcn Sheet)

**Sheet Fields:**
- Customer name (required)
- Phone (required)
- Party size (required)
- Duration (default: 90 min, editable)
- Status (default: CONFIRMED)
- Priority (default: STANDARD)
- Notes (optional)

**Validation:**
- Party size ≤ table capacity
- Duration: 30 min to 6 hours
- Conflict detection before save

#### 3. Drag & Drop - Create

Click-and-drag on empty space:
1. Mouse down starts creation
2. Drag right expands duration (15-min snapping)
3. Mouse up opens Sheet with pre-filled table, time, duration

#### 4. Drag & Drop - Move

Drag existing blocks:
- Horizontal: Change time
- Vertical: Change table
- Ghost preview while dragging
- Snap to 15-min boundaries
- Red warning on conflicts
- Cannot drop on occupied space
- Prevent drop outside operating hours

#### 5. Drag & Drop - Resize

Drag block edges:
- Right edge: Extend/reduce duration
- Left edge: Change start time + duration
- Constraints: 30 min to 4 hours
- 15-min snapping
- Real-time duration display
- Conflict warnings

#### 6. Context Menu

Right-click menu:
- Edit details
- Change status (submenu)
- Mark as no-show
- Cancel reservation
- Duplicate
- Delete

**Auto-suggestions on conflicts:**
- Alternative tables (same capacity)
- Alternative times (±15/±30 min)
- Manual override with confirmation

#### 7. Toolbar & Filters

**Left side:**
- Date picker (default: today)
- Sector filter (multi-select)
- Status filter (single-select)
- Search (customer name/phone)
- Clear filters button
- Results indicator ("Showing 55 of 87")

**Right side:**
- Zoom: 50%, 75%, 100%, 125%, 150%

#### 8. State Management (Zustand)

Store manages:
- Reservations list
- Tables and sectors
- Selected date
- Active filters
- Zoom level
- Selected reservation IDs
- CRUD operations

---

### UI Requirements

- **Theme:** Light mode (white background)
- **Font:** shadcn default
- **Colors:** Default text; icons/badges/filters: `rgb(255, 147, 67)`
- **Header:** Minimal, displays "Restaurant Management System"
- **Layout:** Full width and height

**Responsive Design:**
- **Primary target:** Desktop (1280px+)
- **Mobile-friendly:** Must be usable on tablets (768px+) and phones (375px+)
- **Mobile adaptations:**
  - Stack toolbar filters vertically on small screens
  - Touch-friendly drag & drop (larger hit areas)
  - Collapsible filters menu on mobile
  - Horizontal scrolling for timeline on narrow screens
  - Adjust grid cell width for mobile (e.g., 40px per slot)
  - Bottom sheet for reservation forms on mobile instead of side sheet
- Use Tailwind responsive breakpoints (sm, md, lg, xl)

---

### Performance Requirements

- 60fps with 200+ reservations
- React.memo
- Proper key props
- Debounced search/filter
- Lazy loading
- Minimize DOM nodes (CSS Grid)
- Virtual scrolling if needed

---

### Accessibility Standards

- 0 Axe DevTools violations
- ARIA labels and roles
- Focus management in modals
- Focus visible states
- Semantic HTML
- Alt text for icons

---

### Implementation Order

1. Project setup and dependencies
2. Zustand store with seed data
3. Timeline grid layout
4. Reservation block rendering
5. Drag-to-create
6. Drag-to-move and resize
7. Remaining features
8. Responsive design refinements