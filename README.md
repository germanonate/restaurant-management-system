# Restaurant Management System

A modern, full-featured restaurant reservation management system built with React and TypeScript. Features a visual timeline interface for managing table reservations, drag-and-drop scheduling, conflict detection, and real-time availability tracking.

- **[Architecture Docs](./docs/ARCHITECTURE.md)** - Design decisions, algorithms, and technical details
- **[Initial Prompt](./docs/DEVELOPMENT.md)** - Full details on the initial prompt used to start from scratch this project.

## 🔗 Quick Links

- **[Setup Guide](https://github.com/germanonate/restaurant-management-system#setup)** - Get started locally
- **[Live Demo](https://restaurant-management-system-9a2.pages.dev/)** - View the application

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher (install with `npm install -g pnpm`)
- **Git**: For cloning the repository

## 🚀 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/germanonate/restaurant-management-system.git
cd restaurant-management-system
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Development Server

Start the development server with hot reload:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
pnpm build
```

### 5. Preview Production Build

```bash
pnpm preview
```

## 🛠 Tech Stack

- **React** 19+ with TypeScript (strict mode)
- **Vite** - Next generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality accessible components
- **Zustand** - Lightweight state management
- **date-fns** - Date/time utilities
- **Vitest** - Unit testing framework
- **lucide-react** - Icon library

## ✨ Key Features

- **Visual Timeline Grid** - Interactive 15-minute slot timeline (11 AM - 12 AM)
- **Reservation Management** - Create, edit, move, and delete reservations
- **Drag & Drop** - Intuitive drag-to-create and drag-to-move functionality
- **Conflict Detection** - Real-time detection of overlapping reservations
- **Status Tracking** - Support for multiple reservation statuses (Pending, Confirmed, Seated, Finished, No-Show, Cancelled)
- **Priority Levels** - Standard, VIP, and Large Group classifications
- **Filtering & Search** - Filter by sector, status, and search by customer
- **Zoom Controls** - 5 zoom levels (50% - 150%)
- **Responsive Design** - Fully responsive for desktop, tablet, and mobile
- **Real-time Current Time Indicator** - Vertical line showing current time

## 📖 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run unit tests
- `pnpm test:coverage` - Run tests with coverage report

## 📱 Browser Support

- Chrome (latest)

## Known Limitations

- **Multi-select**: Not implemented.
- **Browser support**: Only tested in Google Chrome.
- **Accessibility**: 12 Axe DevTools violations were reported, all related to color contrast. They were considered minor and deprioritized due to time constraints.
- **Auto-Scheduling Assistant**: A custom implementation was developed. Based on the selected values for Date, Table, and Time, the system automatically validates availability and only displays options where a reservation is possible. Options that would result in an invalid reservation cannot be selected.

```
