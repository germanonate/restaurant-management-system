import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { useReservationStore } from '@/stores/reservationStore';
import { calculateKPIs } from './utils/kpiCalculations';
import { KPICard } from './components/KPICard';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = 220;

export const Sidebar = memo(function KPISidebar() {
  const reservations = useReservationStore((state) => state.reservations);
  const tables = useReservationStore((state) => state.tables);
  const selectedDate = useReservationStore((state) => state.selectedDate);
  const sidebarOpen = useReservationStore((state) => state.sidebarOpen);

  const kpis = useMemo(
    () => calculateKPIs(reservations, tables, selectedDate),
    [reservations, tables, selectedDate]
  );

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-muted/30 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out',
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
      aria-label="KPI Dashboard"
      aria-hidden={!sidebarOpen}
    >
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="pb-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            {format(selectedDate, 'MMM d, yyyy')}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="space-y-2">
          <KPICard kpi={kpis.capacityUtilization} />
          <KPICard kpi={kpis.noShowRate} />
          <KPICard kpi={kpis.pendingConfirmations} />
          <KPICard kpi={kpis.averagePartySize} />
          <KPICard kpi={kpis.seatingEfficiency} />
        </div>
      </div>
    </aside>
  );
});
