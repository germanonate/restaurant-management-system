import { UtensilsCrossed } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center h-14 px-4 border-b border-border bg-white shrink-0">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-6 w-6 text-[rgb(255,147,67)]" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">
          Restaurant Management System
        </h1>
      </div>
    </header>
  );
}
