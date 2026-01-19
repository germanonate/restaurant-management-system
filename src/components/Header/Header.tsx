import { Menu, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReservationStore } from '@/stores/reservationStore';

export function Header() {
  const sidebarOpen = useReservationStore((state) => state.sidebarOpen);
  const toggleSidebar = useReservationStore((state) => state.toggleSidebar);

  return (
    <header className="flex items-center h-14 px-4 border-b border-border bg-white shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <UtensilsCrossed className="h-6 w-6 text-[rgb(255,147,67)]" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">
          Restaurant Management System
        </h1>
      </div>
    </header>
  );
}
